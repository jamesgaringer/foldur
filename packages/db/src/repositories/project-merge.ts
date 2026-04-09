import type Database from "@tauri-apps/plugin-sql";
import {
  generateId,
  listProjectMergeCandidates,
  nowISO,
  ProjectMergeCandidateStoredSchema,
  type ProjectMergeCandidateStored,
  type ProjectMergeScoringInput,
} from "@foldur/core";
import type { Project } from "@foldur/core";
import { listEvidenceLinksForEntity } from "./evidence-links.js";
import { getProjectById, listProjects } from "./projects.js";

/** Cap active projects considered for O(n²) pair scoring. */
export const MAX_ACTIVE_PROJECTS_FOR_MERGE_RECOMPUTE = 400;

export interface MergeCandidateListRow {
  candidate: ProjectMergeCandidateStored;
  title_a: string;
  title_b: string;
}

export interface RecomputeMergeCandidatesResult {
  /** Pairs inserted after scoring. */
  inserted: number;
  /** Active projects considered (after cap). */
  projectsConsidered: number;
}

function projectToMergeInput(p: Project): ProjectMergeScoringInput {
  return {
    id: p.id,
    canonical_title: p.canonical_title,
    description: p.description,
    first_seen_at: p.first_seen_at,
    last_seen_at: p.last_seen_at,
  };
}

/**
 * Replaces `project_merge_candidates` with fresh pairs from deterministic scoring.
 */
export async function recomputeProjectMergeCandidates(
  db: Database,
): Promise<RecomputeMergeCandidatesResult> {
  const active = await listProjects(db);
  const slice = active.slice(0, MAX_ACTIVE_PROJECTS_FOR_MERGE_RECOMPUTE);
  const inputs = slice.map(projectToMergeInput);
  const pairs = listProjectMergeCandidates(inputs, {
    minCombined: 0.55,
    maxPairs: 500,
  });

  await db.execute("DELETE FROM project_merge_candidates");

  const computedAt = nowISO();
  for (const pair of pairs) {
    const id = generateId();
    await db.execute(
      `INSERT INTO project_merge_candidates
       (id, project_a_id, project_b_id, score_combined, score_title, score_description, score_temporal, computed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        pair.project_a_id,
        pair.project_b_id,
        pair.score.combined,
        pair.score.title_similarity,
        pair.score.description_similarity,
        pair.score.temporal_overlap,
        computedAt,
      ],
    );
  }

  return { inserted: pairs.length, projectsConsidered: slice.length };
}

/**
 * Stored candidates joined to current titles; excludes rows if either side is missing or archived.
 */
export async function listMergeCandidatesDetailed(
  db: Database,
): Promise<MergeCandidateListRow[]> {
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT
       c.id,
       c.project_a_id,
       c.project_b_id,
       c.score_combined,
       c.score_title,
       c.score_description,
       c.score_temporal,
       c.computed_at,
       pa.canonical_title AS title_a,
       pb.canonical_title AS title_b
     FROM project_merge_candidates c
     JOIN projects pa ON pa.id = c.project_a_id
     JOIN projects pb ON pb.id = c.project_b_id
     WHERE pa.status != 'archived' AND pb.status != 'archived'
     ORDER BY c.score_combined DESC`,
  );

  return rows.map((r) => ({
    candidate: ProjectMergeCandidateStoredSchema.parse({
      id: r.id,
      project_a_id: r.project_a_id,
      project_b_id: r.project_b_id,
      score_combined: r.score_combined,
      score_title: r.score_title,
      score_description: r.score_description,
      score_temporal: r.score_temporal,
      computed_at: r.computed_at,
    }),
    title_a: String(r.title_a ?? ""),
    title_b: String(r.title_b ?? ""),
  }));
}

/**
 * Consolidates `mergedId` into `survivorId`: evidence rewired (deduped),
 * merged project archived, audit row inserted.
 *
 * NOTE: Does not use an explicit SQL transaction because `@tauri-apps/plugin-sql`
 * dispatches each IPC call to potentially different connections from the sqlx pool,
 * so `BEGIN`/`COMMIT` across multiple calls deadlocks. Instead each step is
 * auto-committed and the function is designed to be idempotent on retry:
 *   - Evidence dedup checks prevent double-rewiring.
 *   - The merge decision's UNIQUE(merged_project_id) prevents duplicate records.
 *   - Archiving an already-archived project is a no-op UPDATE.
 */
export async function mergeProjectsIntoCanonical(
  db: Database,
  survivorId: string,
  mergedId: string,
  options?: { notes?: string | null },
): Promise<void> {
  if (survivorId === mergedId) {
    throw new Error("mergeProjectsIntoCanonical: survivor and merged must differ");
  }

  const existingMerge = await db.select<{ surviving_project_id: string }[]>(
    "SELECT surviving_project_id FROM project_merge_decisions WHERE merged_project_id = $1",
    [mergedId],
  );
  if (existingMerge.length > 0) {
    const prior = existingMerge[0]!.surviving_project_id;
    if (prior === survivorId) {
      return;
    }
    throw new Error(
      "mergeProjectsIntoCanonical: merged project was already absorbed into a different canonical project",
    );
  }

  const survivor = await getProjectById(db, survivorId);
  const merged = await getProjectById(db, mergedId);
  if (!survivor || !merged) {
    throw new Error("mergeProjectsIntoCanonical: unknown project id");
  }
  if (survivor.status === "archived") {
    throw new Error("mergeProjectsIntoCanonical: survivor must not be archived");
  }
  if (merged.status === "archived") {
    throw new Error("mergeProjectsIntoCanonical: merged project is already archived");
  }

  // 1. Rewire evidence links (idempotent: dedup check per link)
  const loserLinks = await listEvidenceLinksForEntity(db, "project", mergedId);
  for (const link of loserLinks) {
    const dup = await db.select<{ cnt: number }[]>(
      `SELECT COUNT(*) as cnt FROM evidence_links
       WHERE entity_type = 'project' AND entity_id = $1
         AND session_id = $2
         AND COALESCE(message_id,'') = COALESCE($3,'')
         AND COALESCE(artifact_id,'') = COALESCE($4,'')
         AND COALESCE(chunk_id,'') = COALESCE($5,'')`,
      [
        survivorId,
        link.session_id,
        link.message_id,
        link.artifact_id,
        link.chunk_id,
      ],
    );
    if ((dup[0]?.cnt ?? 0) > 0) {
      await db.execute("DELETE FROM evidence_links WHERE id = $1", [
        link.id,
      ]);
    } else {
      await db.execute(
        "UPDATE evidence_links SET entity_id = $1 WHERE id = $2",
        [survivorId, link.id],
      );
    }
  }

  // 2. Record the merge decision (UNIQUE constraint prevents duplicates on retry)
  const decisionId = generateId();
  const decidedAt = nowISO();
  await db.execute(
    `INSERT INTO project_merge_decisions
     (id, surviving_project_id, merged_project_id, decided_at, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      decisionId,
      survivorId,
      mergedId,
      decidedAt,
      options?.notes ?? null,
    ],
  );

  // 3. Archive the merged project
  const updatedAt = nowISO();
  await db.execute(
    `UPDATE projects SET status = 'archived', updated_at = $1 WHERE id = $2`,
    [updatedAt, mergedId],
  );

  // 4. Clean up candidate rows involving either project
  await db.execute(
    `DELETE FROM project_merge_candidates WHERE project_a_id = $1 OR project_a_id = $2`,
    [survivorId, mergedId],
  );
  await db.execute(
    `DELETE FROM project_merge_candidates WHERE project_b_id = $1 OR project_b_id = $2`,
    [survivorId, mergedId],
  );
}

/** If this project id was merged into another, returns the surviving project id. */
export async function getSurvivorProjectIdForMerged(
  db: Database,
  mergedProjectId: string,
): Promise<string | null> {
  const rows = await db.select<{ surviving_project_id: string }[]>(
    "SELECT surviving_project_id FROM project_merge_decisions WHERE merged_project_id = $1",
    [mergedProjectId],
  );
  return rows[0]?.surviving_project_id ?? null;
}
