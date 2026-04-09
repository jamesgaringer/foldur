import { z } from "zod";

/** Row in `project_merge_candidates`. */
export const ProjectMergeCandidateStoredSchema = z.object({
  id: z.string(),
  project_a_id: z.string(),
  project_b_id: z.string(),
  score_combined: z.number(),
  score_title: z.number(),
  score_description: z.number().nullable(),
  score_temporal: z.number(),
  computed_at: z.string(),
});

export type ProjectMergeCandidateStored = z.infer<
  typeof ProjectMergeCandidateStoredSchema
>;

/** Row in `project_merge_decisions`. */
export const ProjectMergeDecisionStoredSchema = z.object({
  id: z.string(),
  surviving_project_id: z.string(),
  merged_project_id: z.string(),
  decided_at: z.string(),
  notes: z.string().nullable(),
});

export type ProjectMergeDecisionStored = z.infer<
  typeof ProjectMergeDecisionStoredSchema
>;
