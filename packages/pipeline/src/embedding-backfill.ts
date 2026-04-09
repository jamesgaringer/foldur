import type Database from "@tauri-apps/plugin-sql";
import type { EmbeddingProvider } from "@foldur/core";
import {
  listChunkTextBatchWithoutEmbedding,
  updateChunkEmbeddingVector,
} from "@foldur/db";

export interface EnsureChunkEmbeddingsOptions {
  /** Rows per batch (embed + update). Default 80. */
  batchSize?: number;
}

/**
 * Fills `chunks.embedding_vector` for rows that are still NULL (e.g. indexed
 * before embeddings were enabled). Idempotent: no-ops when nothing is missing.
 */
export async function ensureChunkEmbeddingsUpToDate(
  db: Database,
  provider: EmbeddingProvider,
  options?: EnsureChunkEmbeddingsOptions,
): Promise<{ chunksUpdated: number }> {
  const batchSize = options?.batchSize ?? 80;
  let chunksUpdated = 0;

  while (true) {
    const batch = await listChunkTextBatchWithoutEmbedding(db, batchSize);
    if (batch.length === 0) break;

    const vectors = await provider.embed(batch.map((b) => b.text));
    if (vectors.length !== batch.length) {
      throw new Error(`Embedding provider returned ${vectors.length} vectors for ${batch.length} chunks`);
    }

    for (let i = 0; i < batch.length; i++) {
      const vec = vectors[i]!;
      if (vec.length !== provider.dimension) {
        throw new Error(
          `Embedding dimension mismatch: expected ${provider.dimension}, got ${vec.length}`,
        );
      }
      await updateChunkEmbeddingVector(
        db,
        batch[i]!.id,
        JSON.stringify(vec),
      );
      chunksUpdated++;
    }
  }

  return { chunksUpdated };
}
