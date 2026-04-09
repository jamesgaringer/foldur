import { z } from "zod";

/** Minimal project fields used for deterministic merge scoring. */
export const ProjectMergeScoringInputSchema = z.object({
  id: z.string(),
  canonical_title: z.string(),
  description: z.string().nullable(),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
});

export type ProjectMergeScoringInput = z.infer<
  typeof ProjectMergeScoringInputSchema
>;

export const MergeScoreBreakdownSchema = z.object({
  title_similarity: z.number().min(0).max(1),
  description_similarity: z.number().min(0).max(1).nullable(),
  temporal_overlap: z.number().min(0).max(1),
  /** Weighted combination in `[0, 1]`. */
  combined: z.number().min(0).max(1),
});

export type MergeScoreBreakdown = z.infer<typeof MergeScoreBreakdownSchema>;

export const ProjectMergeCandidatePairSchema = z.object({
  project_a_id: z.string(),
  project_b_id: z.string(),
  score: MergeScoreBreakdownSchema,
});

export type ProjectMergeCandidatePair = z.infer<
  typeof ProjectMergeCandidatePairSchema
>;
