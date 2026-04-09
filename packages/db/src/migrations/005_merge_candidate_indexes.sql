-- Speed up DELETE / lookups on merge candidate pairs (project ids are lex-ordered in rows).
CREATE INDEX IF NOT EXISTS idx_merge_candidates_project_a
  ON project_merge_candidates (project_a_id);
CREATE INDEX IF NOT EXISTS idx_merge_candidates_project_b
  ON project_merge_candidates (project_b_id);
