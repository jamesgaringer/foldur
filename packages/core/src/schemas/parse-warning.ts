import { z } from "zod";

export const ParseWarningSchema = z.object({
  id: z.string(),
  import_batch_id: z.string(),
  code: z.string(),
  message: z.string(),
  context_json: z.string().nullable(),
  created_at: z.string(),
});

export type ParseWarning = z.infer<typeof ParseWarningSchema>;

export const NewParseWarningSchema = ParseWarningSchema.omit({
  id: true,
  created_at: true,
});
export type NewParseWarning = z.infer<typeof NewParseWarningSchema>;
