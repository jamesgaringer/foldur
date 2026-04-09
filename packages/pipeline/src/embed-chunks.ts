import type { EmbeddingProvider, NewChunk } from "@foldur/core";

export async function applyEmbeddingsToChunks(
  chunks: NewChunk[],
  provider: EmbeddingProvider,
): Promise<void> {
  if (chunks.length === 0) return;
  const texts = chunks.map((c) => c.text);
  const vectors = await provider.embed(texts);
  if (vectors.length !== chunks.length) {
    throw new Error("Embedding provider returned a different batch size than chunks");
  }
  for (let i = 0; i < chunks.length; i++) {
    const vec = vectors[i]!;
    if (vec.length !== provider.dimension) {
      throw new Error(
        `Embedding dimension mismatch: expected ${provider.dimension}, got ${vec.length}`,
      );
    }
    chunks[i]!.embedding_vector = JSON.stringify(vec);
  }
}
