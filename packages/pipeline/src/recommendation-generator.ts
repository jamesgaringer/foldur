import type Database from "@tauri-apps/plugin-sql";
import {
  createEvidenceLink,
  createRecommendation,
  findOpenRecommendationByTitle,
  getProjectsWithActivity,
  getThemesWithRecurrence,
  listEvidenceLinksForEntity,
  listMergeCandidatesDetailed,
} from "@foldur/db";

export interface RecommendationGeneratorResult {
  created: number;
  skippedDuplicate: number;
}

/**
 * Generates data-driven recommendations from project/theme state.
 * Idempotent: skips recommendations whose title already exists as open.
 */
export async function generateRecommendations(
  db: Database,
): Promise<RecommendationGeneratorResult> {
  let created = 0;
  let skippedDuplicate = 0;

  const stalledResult = await generateStalledProjectRecs(db);
  created += stalledResult.created;
  skippedDuplicate += stalledResult.skippedDuplicate;

  const consolidateResult = await generateConsolidationRecs(db);
  created += consolidateResult.created;
  skippedDuplicate += consolidateResult.skippedDuplicate;

  const patternResult = await generatePatternRecs(db);
  created += patternResult.created;
  skippedDuplicate += patternResult.skippedDuplicate;

  const revisitResult = await generateRevisitRecs(db);
  created += revisitResult.created;
  skippedDuplicate += revisitResult.skippedDuplicate;

  return { created, skippedDuplicate };
}

async function createRecIfNew(
  db: Database,
  input: {
    title: string;
    rationale: string;
    recommendation_type: "next_action" | "revive_stalled" | "consolidate" | "revisit_decision" | "reflect_pattern" | "extract_plan";
    priority_score: number;
    actionability_score: number;
    grounding_score: number;
  },
  evidenceSessionId: string,
  evidenceMessageId?: string | null,
  evidenceExcerpt?: string | null,
): Promise<boolean> {
  const existing = await findOpenRecommendationByTitle(db, input.title);
  if (existing) return false;

  const rec = await createRecommendation(db, input);

  await createEvidenceLink(db, {
    entity_type: "recommendation",
    entity_id: rec.id,
    session_id: evidenceSessionId,
    message_id: evidenceMessageId ?? null,
    artifact_id: null,
    chunk_id: null,
    excerpt: evidenceExcerpt ?? null,
    explanation: `Auto-generated ${input.recommendation_type} recommendation.`,
    evidence_score: input.grounding_score,
  });

  return true;
}

async function generateStalledProjectRecs(
  db: Database,
): Promise<{ created: number; skippedDuplicate: number }> {
  const projects = await getProjectsWithActivity(db);
  const stalled = projects.filter(
    (p) => p.status === "stalled" && p.session_count >= 3,
  );

  let created = 0;
  let skippedDuplicate = 0;

  for (const p of stalled.slice(0, 5)) {
    const title = `Resume: ${p.canonical_title.slice(0, 80)}`;
    const rationale = `This project was active across ${p.session_count} sessions but hasn't had activity in ${p.days_since_last_activity} days. Consider picking it back up or archiving it.`;

    const evidence = await listEvidenceLinksForEntity(db, "project", p.id);
    const sessionId = evidence[0]?.session_id;
    if (!sessionId) continue;

    const wasCreated = await createRecIfNew(
      db,
      {
        title,
        rationale,
        recommendation_type: "revive_stalled",
        priority_score: Math.min(0.5 + p.session_count * 0.05, 0.85),
        actionability_score: 0.7,
        grounding_score: 0.6,
      },
      sessionId,
      evidence[0]?.message_id,
      evidence[0]?.excerpt,
    );
    if (wasCreated) created++;
    else skippedDuplicate++;
  }

  return { created, skippedDuplicate };
}

async function generateConsolidationRecs(
  db: Database,
): Promise<{ created: number; skippedDuplicate: number }> {
  let created = 0;
  let skippedDuplicate = 0;

  try {
    const candidates = await listMergeCandidatesDetailed(db);
    const highScore = candidates.filter((c) => c.candidate.score_combined > 0.6);

    for (const c of highScore.slice(0, 3)) {
      const score = Math.round(c.candidate.score_combined * 100);
      const title = `Merge: "${c.title_a.slice(0, 40)}" and "${c.title_b.slice(0, 40)}"`;
      const rationale = `These two projects have ${score}% similarity. Consider merging them to consolidate your work history.`;

      const evidence = await listEvidenceLinksForEntity(
        db,
        "project",
        c.candidate.project_a_id,
      );
      const sessionId = evidence[0]?.session_id;
      if (!sessionId) continue;

      const wasCreated = await createRecIfNew(
        db,
        {
          title,
          rationale,
          recommendation_type: "consolidate",
          priority_score: Math.min(c.candidate.score_combined, 0.9),
          actionability_score: 0.8,
          grounding_score: 0.7,
        },
        sessionId,
        evidence[0]?.message_id,
        evidence[0]?.excerpt,
      );
      if (wasCreated) created++;
      else skippedDuplicate++;
    }
  } catch {
    // merge candidates table may be empty if scan hasn't run yet
  }

  return { created, skippedDuplicate };
}

async function generatePatternRecs(
  db: Database,
): Promise<{ created: number; skippedDuplicate: number }> {
  const themes = await getThemesWithRecurrence(db);
  const hot = themes.filter((t) => t.recent_count >= 5 && t.trend === "rising");

  let created = 0;
  let skippedDuplicate = 0;

  for (const t of hot.slice(0, 3)) {
    const title = `Active topic: ${t.label.slice(0, 80)}`;
    const rationale = `This theme appeared in ${t.recent_count} sessions over the last 2 weeks and is trending upward. Consider whether this deserves a dedicated project.`;

    const evidence = await listEvidenceLinksForEntity(db, "theme", t.id);
    const sessionId = evidence[0]?.session_id;
    if (!sessionId) continue;

    const wasCreated = await createRecIfNew(
      db,
      {
        title,
        rationale,
        recommendation_type: "reflect_pattern",
        priority_score: Math.min(0.5 + t.recent_count * 0.05, 0.85),
        actionability_score: 0.6,
        grounding_score: 0.65,
      },
      sessionId,
      evidence[0]?.message_id,
      evidence[0]?.excerpt,
    );
    if (wasCreated) created++;
    else skippedDuplicate++;
  }

  return { created, skippedDuplicate };
}

async function generateRevisitRecs(
  db: Database,
): Promise<{ created: number; skippedDuplicate: number }> {
  let created = 0;
  let skippedDuplicate = 0;

  const rows = await db.select<{
    session_id: string;
    title: string | null;
    msg_count: number;
    word_count: number;
    started_at: string | null;
  }[]>(
    `SELECT sa.session_id, s.title, sa.message_count AS msg_count,
            sa.word_count, s.started_at
     FROM session_analytics sa
     JOIN sessions s ON s.id = sa.session_id
     WHERE sa.message_count >= 10
       AND sa.word_count >= 2000
       AND date(COALESCE(s.started_at, s.created_at)) <= date('now', '-30 days')
     ORDER BY sa.word_count DESC
     LIMIT 5`,
  );

  for (const r of rows) {
    const sessionTitle = r.title?.trim() || "Untitled session";
    const dateStr = r.started_at
      ? new Date(r.started_at).toLocaleDateString()
      : "unknown date";
    const title = `Revisit: ${sessionTitle.slice(0, 80)}`;
    const rationale = `This session from ${dateStr} had ${r.msg_count} messages and ${r.word_count.toLocaleString()} words — a substantial discussion worth revisiting.`;

    const wasCreated = await createRecIfNew(
      db,
      {
        title,
        rationale,
        recommendation_type: "revisit_decision",
        priority_score: Math.min(0.4 + r.word_count / 10000, 0.75),
        actionability_score: 0.5,
        grounding_score: 0.8,
      },
      r.session_id,
      null,
      null,
    );
    if (wasCreated) created++;
    else skippedDuplicate++;
  }

  return { created, skippedDuplicate };
}
