import { z } from "zod";
import { PatternCategory } from "../enums.js";

export const PatternSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  category: PatternCategory,
  confidence: z.number().min(0).max(1),
  impact_score: z.number().min(0).max(1).nullable(),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Pattern = z.infer<typeof PatternSchema>;

export const NewPatternSchema = PatternSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type NewPattern = z.infer<typeof NewPatternSchema>;
