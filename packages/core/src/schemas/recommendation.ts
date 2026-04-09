import { z } from "zod";
import { RecommendationType } from "../enums.js";

export const RecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string(),
  recommendation_type: RecommendationType,
  priority_score: z.number().min(0).max(1),
  actionability_score: z.number().min(0).max(1),
  grounding_score: z.number().min(0).max(1),
  created_at: z.string(),
  dismissed_at: z.string().nullable(),
  accepted_at: z.string().nullable(),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

export const NewRecommendationSchema = RecommendationSchema.omit({
  id: true,
  created_at: true,
  dismissed_at: true,
  accepted_at: true,
});
export type NewRecommendation = z.infer<typeof NewRecommendationSchema>;
