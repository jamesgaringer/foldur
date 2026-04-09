import type Database from "@tauri-apps/plugin-sql";
import {
  listProjects,
  listEvidenceLinksForEntity,
  getSessionById,
  updateProjectEnrichment,
} from "@foldur/db";

export interface ProjectEnrichmentResult {
  enriched: number;
  skipped: number;
}

/**
 * Enriches projects with status lifecycle, momentum, descriptions, confidence,
 * and source span count. Runs after extraction backfill on startup.
 * Idempotent: re-enriches all non-archived projects every run.
 */
export async function ensureProjectEnrichmentUpToDate(
  db: Database,
): Promise<ProjectEnrichmentResult> {
  const projects = await listProjects(db);
  const totalSessions = await getTotalSessionCount(db);
  let enriched = 0;
  let skipped = 0;

  for (const project of projects) {
    if (project.status === "archived") {
      skipped++;
      continue;
    }

    const evidence = await listEvidenceLinksForEntity(db, "project", project.id);
    const sessionIds = [...new Set(evidence.map((e) => e.session_id))];
    const sessionCount = sessionIds.length;

    const sourceIds = new Set<string>();
    for (const sid of sessionIds) {
      const session = await getSessionById(db, sid);
      if (session) sourceIds.add(session.source_id);
    }

    const now = Date.now();
    const lastSeenMs = new Date(project.last_seen_at).getTime();
    const daysSinceLastActivity = Math.floor((now - lastSeenMs) / 86400000);
    const ageInDays = Math.floor(
      (now - new Date(project.first_seen_at).getTime()) / 86400000,
    );

    const recentEvidenceCount = evidence.filter((e) => {
      const created = new Date(e.created_at).getTime();
      return now - created < 14 * 86400000;
    }).length;

    let status = project.status;
    let confidence = project.confidence;

    if (sessionCount >= 2) {
      if (daysSinceLastActivity > 30) {
        status = "stalled";
        confidence = Math.max(confidence, 0.5);
      } else {
        status = "active";
        confidence = Math.min(0.6 + sessionCount * 0.05, 0.9);
      }
    } else if (sessionCount === 1 && ageInDays > 7) {
      status = "speculative";
      confidence = 0.35;
    } else {
      status = "speculative";
      confidence = 0.35;
    }

    const momentum = totalSessions > 0
      ? Math.min(recentEvidenceCount / Math.max(sessionCount, 1), 1)
      : 0;

    const sessionTitles: string[] = [];
    for (const sid of sessionIds.slice(0, 5)) {
      const s = await getSessionById(db, sid);
      if (s?.title) sessionTitles.push(s.title.trim());
    }

    let description: string | null = null;
    if (sessionCount >= 2) {
      const uniqueTitles = [...new Set(sessionTitles)].slice(0, 3);
      description = `Work across ${sessionCount} session${sessionCount > 1 ? "s" : ""}: ${uniqueTitles.join(", ")}`;
    } else if (sessionCount === 1 && sessionTitles.length > 0) {
      description = `Single session: ${sessionTitles[0]}`;
    }

    await updateProjectEnrichment(db, project.id, {
      status,
      confidence,
      momentum_score: momentum,
      description,
      source_span_count: sourceIds.size,
    });

    enriched++;
  }

  return { enriched, skipped };
}

async function getTotalSessionCount(db: Database): Promise<number> {
  const rows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM sessions",
  );
  return rows[0]?.cnt ?? 0;
}
