import type { EmbeddingProvider } from "@foldur/core";

/** Fixed dimension for the deterministic local embedding. */
export const HASH_PROJECTION_DIM = 64;

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h >>>= 0;
  }
  return h >>> 0;
}

function embedOne(text: string): number[] {
  const vec = new Float64Array(HASH_PROJECTION_DIM);
  const words = text.trim().length === 0 ? [] : text.split(/\s+/).filter(Boolean);
  const cap = Math.min(words.length, 512);
  for (let i = 0; i < cap; i++) {
    const w = words[i]!;
    const h = djb2(w);
    for (let k = 0; k < 4; k++) {
      const slot = (h + k * 17 + i) % HASH_PROJECTION_DIM;
      const delta =
        Math.sin(((h >> (k * 8)) % 256) * 0.01) +
        Math.cos((i + 1) * (w.length + 1) * 0.01);
      vec[slot] = (vec[slot] ?? 0) + delta;
    }
  }
  let sum = 0;
  for (let i = 0; i < HASH_PROJECTION_DIM; i++) {
    sum += vec[i]! * vec[i]!;
  }
  const norm = Math.sqrt(sum) || 1;
  const out: number[] = new Array(HASH_PROJECTION_DIM);
  for (let i = 0; i < HASH_PROJECTION_DIM; i++) {
    out[i] = vec[i]! / norm;
  }
  return out;
}

/**
 * Deterministic, fully local pseudo-embeddings (no network, no ML weights).
 * Useful for wiring hybrid retrieval and tests; not a semantic model.
 */
export function createHashProjectionEmbeddingProvider(): EmbeddingProvider {
  return {
    id: "hash-projection-local-64",
    isLocal: true,
    dimension: HASH_PROJECTION_DIM,
    async embed(texts: string[]): Promise<number[][]> {
      return texts.map(embedOne);
    },
  };
}
