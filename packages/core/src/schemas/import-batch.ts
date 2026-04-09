import { z } from "zod";
import { ImportStatus } from "../enums.js";

export const ImportBatchSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  imported_at: z.string(),
  file_name: z.string(),
  file_hash: z.string(),
  parser_version: z.string(),
  status: ImportStatus,
  raw_storage_path: z.string().nullable(),
  metadata_json: z.string().nullable(),
  session_count: z.number().int().nonnegative().default(0),
  warning_count: z.number().int().nonnegative().default(0),
  /** Latest search index pipeline version applied to this batch (0 = not indexed for current pipeline). */
  search_index_version: z.number().int().nonnegative().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ImportBatch = z.infer<typeof ImportBatchSchema>;

export const NewImportBatchSchema = ImportBatchSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type NewImportBatch = z.infer<typeof NewImportBatchSchema>;
