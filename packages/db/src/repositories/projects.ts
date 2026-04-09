import type Database from "@tauri-apps/plugin-sql";
import type { NewProject, Project } from "@foldur/core";
import { ProjectSchema, generateId, nowISO } from "@foldur/core";

export async function createProject(
  db: Database,
  input: NewProject,
): Promise<Project> {
  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO projects
     (id, canonical_title, description, status, confidence, momentum_score,
      first_seen_at, last_seen_at, source_span_count, next_action_summary, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id,
      input.canonical_title,
      input.description,
      input.status,
      input.confidence,
      input.momentum_score,
      input.first_seen_at,
      input.last_seen_at,
      input.source_span_count,
      input.next_action_summary,
      now,
      now,
    ],
  );

  return ProjectSchema.parse({
    id,
    ...input,
    created_at: now,
    updated_at: now,
  });
}

export async function getProjectById(
  db: Database,
  id: string,
): Promise<Project | null> {
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM projects WHERE id = $1",
    [id],
  );
  return rows.length > 0 ? ProjectSchema.parse(rows[0]) : null;
}

export async function listProjects(
  db: Database,
  options?: { includeArchived?: boolean },
): Promise<Project[]> {
  const includeArchived = options?.includeArchived ?? false;
  const sql = includeArchived
    ? "SELECT * FROM projects ORDER BY last_seen_at DESC"
    : "SELECT * FROM projects WHERE status != 'archived' ORDER BY last_seen_at DESC";
  const rows = await db.select<Record<string, unknown>[]>(sql);
  return rows.map((r) => ProjectSchema.parse(r));
}

export interface ProjectEnrichmentUpdate {
  status?: string;
  confidence?: number;
  momentum_score?: number | null;
  description?: string | null;
  source_span_count?: number;
  next_action_summary?: string | null;
}

export async function updateProjectEnrichment(
  db: Database,
  id: string,
  update: ProjectEnrichmentUpdate,
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (update.status !== undefined) {
    sets.push(`status = $${i++}`);
    params.push(update.status);
  }
  if (update.confidence !== undefined) {
    sets.push(`confidence = $${i++}`);
    params.push(update.confidence);
  }
  if (update.momentum_score !== undefined) {
    sets.push(`momentum_score = $${i++}`);
    params.push(update.momentum_score);
  }
  if (update.description !== undefined) {
    sets.push(`description = $${i++}`);
    params.push(update.description);
  }
  if (update.source_span_count !== undefined) {
    sets.push(`source_span_count = $${i++}`);
    params.push(update.source_span_count);
  }
  if (update.next_action_summary !== undefined) {
    sets.push(`next_action_summary = $${i++}`);
    params.push(update.next_action_summary);
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = $${i++}`);
  params.push(nowISO());
  params.push(id);

  await db.execute(
    `UPDATE projects SET ${sets.join(", ")} WHERE id = $${i}`,
    params,
  );
}

export async function countProjects(
  db: Database,
  options?: { includeArchived?: boolean },
): Promise<number> {
  const includeArchived = options?.includeArchived ?? false;
  const sql = includeArchived
    ? "SELECT COUNT(*) as cnt FROM projects"
    : "SELECT COUNT(*) as cnt FROM projects WHERE status != 'archived'";
  const rows = await db.select<{ cnt: number }[]>(sql);
  return rows[0]?.cnt ?? 0;
}
