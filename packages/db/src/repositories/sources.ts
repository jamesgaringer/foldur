import type Database from "@tauri-apps/plugin-sql";
import type { Source, NewSource, SourceType } from "@foldur/core";
import { SourceSchema, generateId, nowISO } from "@foldur/core";

export async function upsertSource(
  db: Database,
  source: NewSource,
): Promise<Source> {
  const existing = await db.select<Source[]>(
    "SELECT * FROM sources WHERE type = $1 AND adapter_key = $2",
    [source.type, source.adapter_key],
  );

  if (existing.length > 0) {
    return SourceSchema.parse(existing[0]);
  }

  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO sources (id, type, name, version, adapter_key, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, source.type, source.name, source.version, source.adapter_key, now, now],
  );

  return SourceSchema.parse({
    id,
    ...source,
    created_at: now,
    updated_at: now,
  });
}

export async function getSourceById(
  db: Database,
  id: string,
): Promise<Source | null> {
  const rows = await db.select<Source[]>(
    "SELECT * FROM sources WHERE id = $1",
    [id],
  );
  return rows.length > 0 ? SourceSchema.parse(rows[0]) : null;
}

export async function getSourceByType(
  db: Database,
  type: SourceType,
): Promise<Source | null> {
  const rows = await db.select<Source[]>(
    "SELECT * FROM sources WHERE type = $1 LIMIT 1",
    [type],
  );
  return rows.length > 0 ? SourceSchema.parse(rows[0]) : null;
}

export async function getAllSources(db: Database): Promise<Source[]> {
  const rows = await db.select<Source[]>("SELECT * FROM sources ORDER BY name");
  return rows.map((r) => SourceSchema.parse(r));
}
