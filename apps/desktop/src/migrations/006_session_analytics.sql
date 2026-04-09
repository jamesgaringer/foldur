-- Session analytics: precomputed per-session metrics for smart tab views
CREATE TABLE IF NOT EXISTS session_analytics (
  session_id          TEXT PRIMARY KEY REFERENCES sessions(id),
  message_count       INTEGER NOT NULL DEFAULT 0,
  user_msg_count      INTEGER NOT NULL DEFAULT 0,
  assistant_msg_count INTEGER NOT NULL DEFAULT 0,
  word_count          INTEGER NOT NULL DEFAULT 0,
  duration_minutes    REAL,
  top_keywords_json   TEXT,
  computed_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
