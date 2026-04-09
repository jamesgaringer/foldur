-- Phase 4: project merge suggestions + merge decisions (audit)

CREATE TABLE IF NOT EXISTS project_merge_candidates (
  id                   TEXT PRIMARY KEY,
  project_a_id         TEXT NOT NULL,
  project_b_id         TEXT NOT NULL,
  score_combined       REAL NOT NULL,
  score_title          REAL NOT NULL,
  score_description    REAL,
  score_temporal       REAL NOT NULL,
  computed_at          TEXT NOT NULL,
  CHECK (project_a_id < project_b_id),
  UNIQUE (project_a_id, project_b_id)
);

CREATE INDEX IF NOT EXISTS idx_merge_candidates_combined
  ON project_merge_candidates (score_combined DESC);

CREATE TABLE IF NOT EXISTS project_merge_decisions (
  id                       TEXT PRIMARY KEY,
  surviving_project_id     TEXT NOT NULL,
  merged_project_id        TEXT NOT NULL UNIQUE,
  decided_at               TEXT NOT NULL,
  notes                    TEXT
);

CREATE INDEX IF NOT EXISTS idx_merge_decisions_merged
  ON project_merge_decisions (merged_project_id);

CREATE INDEX IF NOT EXISTS idx_merge_decisions_survivor
  ON project_merge_decisions (surviving_project_id);
