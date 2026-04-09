import { z } from "zod";
import { EntityType } from "../enums.js";

export const EvidenceLinkSchema = z.object({
  id: z.string(),
  entity_type: EntityType,
  entity_id: z.string(),
  session_id: z.string(),
  message_id: z.string().nullable(),
  artifact_id: z.string().nullable(),
  chunk_id: z.string().nullable(),
  excerpt: z.string().nullable(),
  explanation: z.string().nullable(),
  evidence_score: z.number().min(0).max(1),
  created_at: z.string(),
});

export type EvidenceLink = z.infer<typeof EvidenceLinkSchema>;

export const NewEvidenceLinkSchema = EvidenceLinkSchema.omit({
  id: true,
  created_at: true,
});
export type NewEvidenceLink = z.infer<typeof NewEvidenceLinkSchema>;
