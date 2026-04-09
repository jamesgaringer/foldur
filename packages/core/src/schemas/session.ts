import { z } from "zod";
import { SessionType } from "../enums.js";

export const SessionSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  import_batch_id: z.string(),
  external_id: z.string().nullable(),
  title: z.string().nullable(),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  session_type: SessionType,
  metadata_json: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Session = z.infer<typeof SessionSchema>;

export const NewSessionSchema = SessionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type NewSession = z.infer<typeof NewSessionSchema>;
