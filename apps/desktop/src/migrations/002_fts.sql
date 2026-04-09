-- Full-text search index for chunk bodies (FTS5)
-- Populated alongside rows in `chunks` during import.

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  chunk_id UNINDEXED,
  session_id UNINDEXED,
  message_id UNINDEXED,
  source_id UNINDEXED,
  body,
  tokenize = 'unicode61 remove_diacritics 0'
);
