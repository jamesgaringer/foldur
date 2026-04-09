/** Parse JSON array stored in `chunks.embedding_vector`. */
export function parseEmbeddingVector(
  raw: string | null | undefined,
): number[] | null {
  if (raw == null || raw === "") return null;
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return null;
    const nums = arr.map((x) => Number(x));
    if (nums.some((n) => Number.isNaN(n))) return null;
    return nums;
  } catch {
    return null;
  }
}

/** Cosine similarity for equal-length vectors (L2-normalized inputs → dot product). */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}
