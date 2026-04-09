import type Database from "@tauri-apps/plugin-sql";
import type { ParseWarning, NewParseWarning } from "@foldur/core";
import { ParseWarningSchema, generateId, nowISO } from "@foldur/core";

export async function createParseWarning(
  db: Database,
  warning: NewParseWarning,
): Promise<ParseWarning> {
  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO parse_warnings (id, import_batch_id, code, message, context_json, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, warning.import_batch_id, warning.code, warning.message, warning.context_json, now],
  );

  return ParseWarningSchema.parse({ id, ...warning, created_at: now });
}

export async function createParseWarnings(
  db: Database,
  warnings: NewParseWarning[],
): Promise<void> {
  for (const warning of warnings) {
    await createParseWarning(db, warning);
  }
}

export async function getParseWarningsByBatch(
  db: Database,
  importBatchId: string,
): Promise<ParseWarning[]> {
  const rows = await db.select<ParseWarning[]>(
    "SELECT * FROM parse_warnings WHERE import_batch_id = $1 ORDER BY created_at",
    [importBatchId],
  );
  return rows.map((r) => ParseWarningSchema.parse(r));
}
