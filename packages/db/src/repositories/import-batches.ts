import type Database from "@tauri-apps/plugin-sql";
import type { ImportBatch, NewImportBatch, ImportStatus } from "@foldur/core";
import { ImportBatchSchema, generateId, nowISO } from "@foldur/core";

export async function createImportBatch(
  db: Database,
  batch: NewImportBatch,
): Promise<ImportBatch> {
  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO import_batches
     (id, source_id, imported_at, file_name, file_hash, parser_version, status, raw_storage_path, metadata_json, session_count, warning_count, search_index_version, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id,
      batch.source_id,
      batch.imported_at,
      batch.file_name,
      batch.file_hash,
      batch.parser_version,
      batch.status,
      batch.raw_storage_path,
      batch.metadata_json,
      batch.session_count,
      batch.warning_count,
      batch.search_index_version ?? 0,
      now,
      now,
    ],
  );

  return ImportBatchSchema.parse({
    id,
    ...batch,
    created_at: now,
    updated_at: now,
  });
}

export async function updateImportBatchStatus(
  db: Database,
  id: string,
  status: ImportStatus,
  counts?: {
    session_count?: number;
    warning_count?: number;
    search_index_version?: number;
  },
): Promise<void> {
  const now = nowISO();
  const setClauses = ["status = $1", "updated_at = $2"];
  const params: unknown[] = [status, now];
  let paramIdx = 3;

  if (counts?.session_count !== undefined) {
    setClauses.push(`session_count = $${paramIdx}`);
    params.push(counts.session_count);
    paramIdx++;
  }
  if (counts?.warning_count !== undefined) {
    setClauses.push(`warning_count = $${paramIdx}`);
    params.push(counts.warning_count);
    paramIdx++;
  }
  if (counts?.search_index_version !== undefined) {
    setClauses.push(`search_index_version = $${paramIdx}`);
    params.push(counts.search_index_version);
    paramIdx++;
  }

  params.push(id);
  await db.execute(
    `UPDATE import_batches SET ${setClauses.join(", ")} WHERE id = $${paramIdx}`,
    params,
  );
}

export async function getImportBatches(
  db: Database,
): Promise<ImportBatch[]> {
  const rows = await db.select<ImportBatch[]>(
    "SELECT * FROM import_batches ORDER BY imported_at DESC",
  );
  return rows.map((r) => ImportBatchSchema.parse(r));
}

export async function getImportBatchById(
  db: Database,
  id: string,
): Promise<ImportBatch | null> {
  const rows = await db.select<ImportBatch[]>(
    "SELECT * FROM import_batches WHERE id = $1",
    [id],
  );
  return rows.length > 0 ? ImportBatchSchema.parse(rows[0]) : null;
}

export async function importBatchExistsForHash(
  db: Database,
  fileHash: string,
): Promise<boolean> {
  const rows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM import_batches WHERE file_hash = $1 AND status = 'completed'",
    [fileHash],
  );
  return (rows[0]?.cnt ?? 0) > 0;
}

/** Completed imports that need chunking/FTS for the given target pipeline version. */
export async function listImportBatchesNeedingSearchIndex(
  db: Database,
  minVersion: number,
): Promise<ImportBatch[]> {
  const rows = await db.select<ImportBatch[]>(
    `SELECT * FROM import_batches
     WHERE status = 'completed' AND search_index_version < $1
     ORDER BY imported_at ASC`,
    [minVersion],
  );
  return rows.map((r) => ImportBatchSchema.parse(r));
}
