import { z } from "zod";
import { EntityStatus } from "../enums.js";

export const ProjectSchema = z.object({
  id: z.string(),
  canonical_title: z.string(),
  description: z.string().nullable(),
  status: EntityStatus,
  confidence: z.number().min(0).max(1),
  momentum_score: z.number().min(0).max(1).nullable(),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
  source_span_count: z.number().int().nonnegative(),
  next_action_summary: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const NewProjectSchema = ProjectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type NewProject = z.infer<typeof NewProjectSchema>;
