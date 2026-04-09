import { z } from "zod";
import { EntityStatus, GoalHorizon } from "../enums.js";

export const GoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  horizon: GoalHorizon,
  confidence: z.number().min(0).max(1),
  status: EntityStatus,
  first_seen_at: z.string(),
  last_seen_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Goal = z.infer<typeof GoalSchema>;

export const NewGoalSchema = GoalSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type NewGoal = z.infer<typeof NewGoalSchema>;
