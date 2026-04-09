import type Database from "@tauri-apps/plugin-sql";
import type { Pattern, NewPattern, PatternCategory } from "@foldur/core";
import { PatternSchema, generateId, nowISO } from "@foldur/core";

export async function createPattern(
  db: Database,
  input: NewPattern,
): Promise<Pattern> {
  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO patterns
     (id, label, description, category, confidence, impact_score,
      first_seen_at, last_seen_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      input.label,
      input.description,
      input.category,
      input.confidence,
      input.impact_score,
      input.first_seen_at,
      input.last_seen_at,
      now,
      now,
    ],
  );
  return PatternSchema.parse({ id, ...input, created_at: now, updated_at: now });
}

export async function getPatternByLabel(
  db: Database,
  label: string,
): Promise<Pattern | null> {
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM patterns WHERE label = $1 LIMIT 1",
    [label],
  );
  return rows.length > 0 ? PatternSchema.parse(rows[0]) : null;
}

export async function listPatternsByCategory(
  db: Database,
  category: PatternCategory,
): Promise<Pattern[]> {
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM patterns WHERE category = $1 ORDER BY confidence DESC, last_seen_at DESC",
    [category],
  );
  return rows.map((r) => PatternSchema.parse(r));
}

export async function listAllPatterns(db: Database): Promise<Pattern[]> {
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM patterns ORDER BY confidence DESC, last_seen_at DESC",
  );
  return rows.map((r) => PatternSchema.parse(r));
}

export async function updatePattern(
  db: Database,
  id: string,
  update: Partial<Pick<Pattern, "description" | "confidence" | "impact_score" | "last_seen_at">>,
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (update.description !== undefined) {
    sets.push(`description = $${i++}`);
    params.push(update.description);
  }
  if (update.confidence !== undefined) {
    sets.push(`confidence = $${i++}`);
    params.push(update.confidence);
  }
  if (update.impact_score !== undefined) {
    sets.push(`impact_score = $${i++}`);
    params.push(update.impact_score);
  }
  if (update.last_seen_at !== undefined) {
    sets.push(`last_seen_at = $${i++}`);
    params.push(update.last_seen_at);
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = $${i++}`);
  params.push(nowISO());
  params.push(id);

  await db.execute(
    `UPDATE patterns SET ${sets.join(", ")} WHERE id = $${i}`,
    params,
  );
}

export async function deletePattern(
  db: Database,
  id: string,
): Promise<void> {
  await db.execute("DELETE FROM patterns WHERE id = $1", [id]);
}
