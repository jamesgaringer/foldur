import { z } from "zod";
import { MessageRole } from "../enums.js";

export const MessageSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  role: MessageRole,
  author_label: z.string().nullable(),
  timestamp: z.string().nullable(),
  content_text: z.string(),
  content_hash: z.string(),
  raw_payload_json: z.string().nullable(),
  sort_order: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;

export const NewMessageSchema = MessageSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type NewMessage = z.infer<typeof NewMessageSchema>;
