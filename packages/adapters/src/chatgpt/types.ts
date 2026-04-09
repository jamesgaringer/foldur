import { z } from "zod";

export const ChatGPTMessageAuthorSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  name: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ChatGPTContentSchema = z.object({
  content_type: z.string(),
  parts: z.array(z.unknown()).optional().nullable(),
});

export const ChatGPTMessageSchema = z.object({
  id: z.string(),
  author: ChatGPTMessageAuthorSchema,
  create_time: z.number().nullable().optional(),
  update_time: z.number().nullable().optional(),
  content: ChatGPTContentSchema.optional().nullable(),
  status: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ChatGPTMappingNodeSchema = z.object({
  id: z.string(),
  message: ChatGPTMessageSchema.nullable().optional(),
  parent: z.string().nullable().optional(),
  children: z.array(z.string()).optional().default([]),
});

export const ChatGPTConversationSchema = z.object({
  title: z.string().optional().default("Untitled"),
  create_time: z.number().nullable().optional(),
  update_time: z.number().nullable().optional(),
  mapping: z.record(ChatGPTMappingNodeSchema),
  conversation_id: z.string().optional(),
  id: z.string().optional(),
});

export type ChatGPTConversation = z.infer<typeof ChatGPTConversationSchema>;
export type ChatGPTMappingNode = z.infer<typeof ChatGPTMappingNodeSchema>;
