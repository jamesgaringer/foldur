import type Database from "@tauri-apps/plugin-sql";
import type { Chunk, NewChunk } from "@foldur/core";
import { ChunkSchema, generateId, nowISO } from "@foldur/core";

export async function createChunk(
  db: Database,
  chunk: NewChunk,
  sourceId: string,
): Promise<Chunk> {
  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO chunks
     (id, session_id, message_id, artifact_id, chunk_type, text, start_offset, end_offset, embedding_vector, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      chunk.session_id,
      chunk.message_id,
      chunk.artifact_id,
      chunk.chunk_type,
      chunk.text,
      chunk.start_offset,
      chunk.end_offset,
      chunk.embedding_vector,
      now,
    ],
  );

  await db.execute(
    `INSERT INTO chunks_fts (chunk_id, session_id, message_id, source_id, body)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      id,
      chunk.session_id,
      chunk.message_id,
      sourceId,
      chunk.text,
    ],
  );

  return ChunkSchema.parse({ id, ...chunk, created_at: now });
}

export async function createChunks(
  db: Database,
  chunks: NewChunk[],
  sourceId: string,
): Promise<void> {
  for (const c of chunks) {
    await createChunk(db, c, sourceId);
  }
}

/** Removes FTS rows and chunk rows for the given sessions (e.g. before re-indexing). */
export async function deleteChunksForSessions(
  db: Database,
  sessionIds: string[],
): Promise<void> {
  if (sessionIds.length === 0) return;
  const placeholders = sessionIds.map((_, i) => `$${i + 1}`).join(", ");
  await db.execute(
    `DELETE FROM chunks_fts WHERE chunk_id IN (SELECT id FROM chunks WHERE session_id IN (${placeholders}))`,
    sessionIds,
  );
  await db.execute(
    `DELETE FROM chunks WHERE session_id IN (${placeholders})`,
    sessionIds,
  );
}

export async function getChunkById(
  db: Database,
  id: string,
): Promise<Chunk | null> {
  const rows = await db.select<Chunk[]>(
    "SELECT * FROM chunks WHERE id = $1",
    [id],
  );
  return rows.length > 0 ? ChunkSchema.parse(rows[0]) : null;
}

export async function listChunkTextBatchWithoutEmbedding(
  db: Database,
  limit: number,
): Promise<{ id: string; text: string }[]> {
  const rows = await db.select<{ id: string; text: string }[]>(
    "SELECT id, text FROM chunks WHERE embedding_vector IS NULL LIMIT $1",
    [limit],
  );
  return rows;
}

export async function updateChunkEmbeddingVector(
  db: Database,
  chunkId: string,
  embeddingJson: string,
): Promise<void> {
  await db.execute(
    "UPDATE chunks SET embedding_vector = $1 WHERE id = $2",
    [embeddingJson, chunkId],
  );
}
