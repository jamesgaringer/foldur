/**
 * Pluggable text embeddings. Local implementations compute on-device; remote
 * implementations must be explicitly chosen by the user (see privacy rules).
 */
export interface EmbeddingProvider {
  /** Stable id (e.g. model name) for cache invalidation / provenance. */
  readonly id: string;
  readonly isLocal: boolean;
  readonly dimension: number;
  /** Batch embed; order matches `texts`. */
  embed(texts: string[]): Promise<number[][]>;
}
