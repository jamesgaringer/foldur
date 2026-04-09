import { z } from "zod";
import { ArtifactType } from "../enums.js";

export const ArtifactSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  message_id: z.string().nullable(),
  artifact_type: ArtifactType,
  title: z.string().nullable(),
  content_text: z.string(),
  mime_type: z.string().nullable(),
  raw_payload_json: z.string().nullable(),
  created_at: z.string(),
});

export type Artifact = z.infer<typeof ArtifactSchema>;

export const NewArtifactSchema = ArtifactSchema.omit({
  id: true,
  created_at: true,
});
export type NewArtifact = z.infer<typeof NewArtifactSchema>;
