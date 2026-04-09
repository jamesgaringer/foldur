import { z } from "zod";
import { SourceType } from "../enums.js";

export const SourceSchema = z.object({
  id: z.string(),
  type: SourceType,
  name: z.string(),
  version: z.string().nullable(),
  adapter_key: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Source = z.infer<typeof SourceSchema>;

export const NewSourceSchema = SourceSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type NewSource = z.infer<typeof NewSourceSchema>;
