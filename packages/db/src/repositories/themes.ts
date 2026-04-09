import type Database from "@tauri-apps/plugin-sql";
import type { NewTheme, Theme } from "@foldur/core";
import { ThemeSchema, generateId, nowISO } from "@foldur/core";

export async function createTheme(db: Database, input: NewTheme): Promise<Theme> {
  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO themes
     (id, label, description, confidence, recurrence_score, first_seen_at, last_seen_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      input.label,
      input.description,
      input.confidence,
      input.recurrence_score,
      input.first_seen_at,
      input.last_seen_at,
      now,
      now,
    ],
  );

  return ThemeSchema.parse({
    id,
    ...input,
    created_at: now,
    updated_at: now,
  });
}

export async function getThemeById(
  db: Database,
  id: string,
): Promise<Theme | null> {
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM themes WHERE id = $1",
    [id],
  );
  return rows.length > 0 ? ThemeSchema.parse(rows[0]) : null;
}

export async function getThemeByLabel(
  db: Database,
  label: string,
): Promise<Theme | null> {
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM themes WHERE label = $1 LIMIT 1",
    [label],
  );
  return rows.length > 0 ? ThemeSchema.parse(rows[0]) : null;
}

export async function listThemes(db: Database): Promise<Theme[]> {
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM themes ORDER BY last_seen_at DESC",
  );
  return rows.map((r) => ThemeSchema.parse(r));
}

export interface ThemeEnrichmentUpdate {
  description?: string | null;
  confidence?: number;
  recurrence_score?: number | null;
}

export async function updateThemeEnrichment(
  db: Database,
  id: string,
  update: ThemeEnrichmentUpdate,
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
  if (update.recurrence_score !== undefined) {
    sets.push(`recurrence_score = $${i++}`);
    params.push(update.recurrence_score);
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = $${i++}`);
  params.push(nowISO());
  params.push(id);

  await db.execute(
    `UPDATE themes SET ${sets.join(", ")} WHERE id = $${i}`,
    params,
  );
}

export async function countThemes(db: Database): Promise<number> {
  const rows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM themes",
  );
  return rows[0]?.cnt ?? 0;
}
