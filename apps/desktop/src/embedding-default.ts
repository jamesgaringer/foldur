import { createHashProjectionEmbeddingProvider } from "@foldur/embeddings";

/** Default on-device embedding used for import indexing and hybrid search (deterministic hash projection). */
export const defaultEmbeddingProvider = createHashProjectionEmbeddingProvider();
