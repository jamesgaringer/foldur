-- Track whether an import batch has been indexed for the current search pipeline (chunking + FTS).
-- Batches from before Phase 2 default to 0 and are backfilled on app startup.

ALTER TABLE import_batches ADD COLUMN search_index_version INTEGER NOT NULL DEFAULT 0;
