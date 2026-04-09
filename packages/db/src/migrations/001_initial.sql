-- Foldur V1 initial schema
-- Covers: raw layer, normalized layer, intelligence layer, provenance layer, operational layer

-- ============================================================
-- RAW + SOURCE LAYER
-- ============================================================

CREATE TABLE IF NOT EXISTS sources (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL CHECK(type IN ('chatgpt','claude','cursor','generic')),
  name          TEXT NOT NULL,
  version       TEXT,
  adapter_key   TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS import_batches (
  id               TEXT PRIMARY KEY,
  source_id        TEXT NOT NULL REFERENCES sources(id),
  imported_at      TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  file_hash        TEXT NOT NULL,
  parser_version   TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK(status IN ('pending','validating','parsing','normalizing','completed','failed')),
  raw_storage_path TEXT,
  metadata_json    TEXT,
  session_count    INTEGER NOT NULL DEFAULT 0,
  warning_count    INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_import_batches_source ON import_batches(source_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);

-- ============================================================
-- NORMALIZED LAYER
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  id               TEXT PRIMARY KEY,
  source_id        TEXT NOT NULL REFERENCES sources(id),
  import_batch_id  TEXT NOT NULL REFERENCES import_batches(id),
  external_id      TEXT,
  title            TEXT,
  started_at       TEXT,
  ended_at         TEXT,
  session_type     TEXT NOT NULL DEFAULT 'conversation'
                     CHECK(session_type IN ('conversation','coding_session','reasoning_session','artifact_session','unknown')),
  metadata_json    TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_source ON sessions(source_id);
CREATE INDEX IF NOT EXISTS idx_sessions_batch ON sessions(import_batch_id);

CREATE TABLE IF NOT EXISTS messages (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL REFERENCES sessions(id),
  role              TEXT NOT NULL CHECK(role IN ('user','assistant','system','tool','unknown')),
  author_label      TEXT,
  timestamp         TEXT,
  content_text      TEXT NOT NULL,
  content_hash      TEXT NOT NULL,
  raw_payload_json  TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_order ON messages(session_id, sort_order);

CREATE TABLE IF NOT EXISTS artifacts (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL REFERENCES sessions(id),
  message_id        TEXT REFERENCES messages(id),
  artifact_type     TEXT NOT NULL CHECK(artifact_type IN ('code','markdown','file_patch','plan','design_document','other')),
  title             TEXT,
  content_text      TEXT NOT NULL,
  mime_type         TEXT,
  raw_payload_json  TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_artifacts_session ON artifacts(session_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_message ON artifacts(message_id);

CREATE TABLE IF NOT EXISTS chunks (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL REFERENCES sessions(id),
  message_id        TEXT REFERENCES messages(id),
  artifact_id       TEXT REFERENCES artifacts(id),
  chunk_type        TEXT NOT NULL CHECK(chunk_type IN ('message','artifact','mixed')),
  text              TEXT NOT NULL,
  start_offset      INTEGER NOT NULL DEFAULT 0,
  end_offset        INTEGER NOT NULL DEFAULT 0,
  embedding_vector  TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chunks_session ON chunks(session_id);

-- ============================================================
-- INTELLIGENCE LAYER
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id                   TEXT PRIMARY KEY,
  canonical_title      TEXT NOT NULL,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'active'
                         CHECK(status IN ('active','stalled','completed','archived','speculative')),
  confidence           REAL NOT NULL DEFAULT 0.5,
  momentum_score       REAL,
  first_seen_at        TEXT NOT NULL,
  last_seen_at         TEXT NOT NULL,
  source_span_count    INTEGER NOT NULL DEFAULT 0,
  next_action_summary  TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goals (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT,
  horizon        TEXT NOT NULL DEFAULT 'medium_term'
                   CHECK(horizon IN ('short_term','medium_term','long_term','ongoing')),
  confidence     REAL NOT NULL DEFAULT 0.5,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK(status IN ('active','stalled','completed','archived','speculative')),
  first_seen_at  TEXT NOT NULL,
  last_seen_at   TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS themes (
  id               TEXT PRIMARY KEY,
  label            TEXT NOT NULL,
  description      TEXT,
  confidence       REAL NOT NULL DEFAULT 0.5,
  recurrence_score REAL,
  first_seen_at    TEXT NOT NULL,
  last_seen_at     TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS interests (
  id             TEXT PRIMARY KEY,
  label          TEXT NOT NULL,
  strength       REAL NOT NULL DEFAULT 0.5,
  first_seen_at  TEXT NOT NULL,
  last_seen_at   TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patterns (
  id             TEXT PRIMARY KEY,
  label          TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL DEFAULT 'other'
                   CHECK(category IN ('behavioral','cognitive','workflow','temporal','other')),
  confidence     REAL NOT NULL DEFAULT 0.5,
  impact_score   REAL,
  first_seen_at  TEXT NOT NULL,
  last_seen_at   TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recommendations (
  id                   TEXT PRIMARY KEY,
  title                TEXT NOT NULL,
  rationale            TEXT NOT NULL,
  recommendation_type  TEXT NOT NULL
                         CHECK(recommendation_type IN ('next_action','revive_stalled','consolidate','revisit_decision','reflect_pattern','extract_plan')),
  priority_score       REAL NOT NULL DEFAULT 0.5,
  actionability_score  REAL NOT NULL DEFAULT 0.5,
  grounding_score      REAL NOT NULL DEFAULT 0.5,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  dismissed_at         TEXT,
  accepted_at          TEXT
);

-- ============================================================
-- PROVENANCE LAYER
-- ============================================================

CREATE TABLE IF NOT EXISTS evidence_links (
  id             TEXT PRIMARY KEY,
  entity_type    TEXT NOT NULL CHECK(entity_type IN ('project','goal','theme','interest','pattern','recommendation')),
  entity_id      TEXT NOT NULL,
  session_id     TEXT NOT NULL REFERENCES sessions(id),
  message_id     TEXT REFERENCES messages(id),
  artifact_id    TEXT REFERENCES artifacts(id),
  chunk_id       TEXT REFERENCES chunks(id),
  excerpt        TEXT,
  explanation    TEXT,
  evidence_score REAL NOT NULL DEFAULT 0.5,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_evidence_entity ON evidence_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_evidence_session ON evidence_links(session_id);

-- ============================================================
-- OPERATIONAL LAYER
-- ============================================================

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id               TEXT PRIMARY KEY,
  import_batch_id  TEXT REFERENCES import_batches(id),
  stage            TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'running'
                     CHECK(status IN ('running','completed','failed')),
  started_at       TEXT NOT NULL,
  completed_at     TEXT,
  error_message    TEXT,
  metadata_json    TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_batch ON pipeline_runs(import_batch_id);

CREATE TABLE IF NOT EXISTS parse_warnings (
  id               TEXT PRIMARY KEY,
  import_batch_id  TEXT NOT NULL REFERENCES import_batches(id),
  code             TEXT NOT NULL,
  message          TEXT NOT NULL,
  context_json     TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_parse_warnings_batch ON parse_warnings(import_batch_id);
