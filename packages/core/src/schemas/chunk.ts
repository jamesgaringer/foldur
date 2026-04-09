import { z } from "zod";
import { ChunkType } from "../enums.js";

export const ChunkSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  message_id: z.string().nullable(),
  artifact_id: z.string().nullable(),
  chunk_type: ChunkType,
  text: z.string(),
  start_offset: z.number().int().nonnegative(),
  end_offset: z.number().int().nonnegative(),
  embedding_vector: z.string().nullable(),
  created_at: z.string(),
});

export type Chunk = z.infer<typeof ChunkSchema>;

export const NewChunkSchema = ChunkSchema.omit({
  id: true,
  created_at: true,
});
export type NewChunk = z.infer<typeof NewChunkSchema>;
