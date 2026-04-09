import { z } from "zod";

export const ThemeSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  recurrence_score: z.number().min(0).max(1).nullable(),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Theme = z.infer<typeof ThemeSchema>;

export const NewThemeSchema = ThemeSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type NewTheme = z.infer<typeof NewThemeSchema>;
