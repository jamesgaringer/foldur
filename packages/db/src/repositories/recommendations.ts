import type Database from "@tauri-apps/plugin-sql";
import type { NewRecommendation, Recommendation } from "@foldur/core";
import { RecommendationSchema, generateId, nowISO } from "@foldur/core";

export async function createRecommendation(
  db: Database,
  input: NewRecommendation,
): Promise<Recommendation> {
  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO recommendations
     (id, title, rationale, recommendation_type, priority_score, actionability_score, grounding_score, created_at, dismissed_at, accepted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      input.title,
      input.rationale,
      input.recommendation_type,
      input.priority_score,
      input.actionability_score,
      input.grounding_score,
      now,
      null,
      null,
    ],
  );

  return RecommendationSchema.parse({
    id,
    ...input,
    created_at: now,
    dismissed_at: null,
    accepted_at: null,
  });
}

export async function getRecommendationById(
  db: Database,
  id: string,
): Promise<Recommendation | null> {
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM recommendations WHERE id = $1",
    [id],
  );
  return rows.length > 0 ? RecommendationSchema.parse(rows[0]) : null;
}

export async function countRecommendations(db: Database): Promise<number> {
  const rows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM recommendations",
  );
  return rows[0]?.cnt ?? 0;
}

export async function listOpenRecommendations(
  db: Database,
): Promise<Recommendation[]> {
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM recommendations
     WHERE dismissed_at IS NULL AND accepted_at IS NULL
     ORDER BY priority_score DESC, created_at DESC`,
  );
  return rows.map((r) => RecommendationSchema.parse(r));
}

export async function findOpenRecommendationByTitle(
  db: Database,
  title: string,
): Promise<Recommendation | null> {
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM recommendations
     WHERE title = $1 AND dismissed_at IS NULL AND accepted_at IS NULL
     LIMIT 1`,
    [title],
  );
  return rows.length > 0 ? RecommendationSchema.parse(rows[0]) : null;
}

export async function dismissRecommendation(
  db: Database,
  id: string,
): Promise<void> {
  const when = nowISO();
  await db.execute(
    "UPDATE recommendations SET dismissed_at = $1 WHERE id = $2",
    [when, id],
  );
}

export async function acceptRecommendation(
  db: Database,
  id: string,
): Promise<void> {
  const when = nowISO();
  await db.execute(
    "UPDATE recommendations SET accepted_at = $1 WHERE id = $2",
    [when, id],
  );
}
