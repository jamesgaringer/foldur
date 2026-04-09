import { z } from "zod";

export const InterestSchema = z.object({
  id: z.string(),
  label: z.string(),
  strength: z.number().min(0).max(1),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Interest = z.infer<typeof InterestSchema>;

export const NewInterestSchema = InterestSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type NewInterest = z.infer<typeof NewInterestSchema>;
