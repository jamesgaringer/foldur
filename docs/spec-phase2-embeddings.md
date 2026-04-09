# Spec: Phase 2 — Embeddings and hybrid search

## Purpose

Provide a **pluggable embedding surface** (`EmbeddingProvider` in `@foldur/core`) and a **default fully local** implementation that needs no model download, then **blend** FTS BM25 with cosine similarity for ranked results.

## User outcome

- Imports compute embeddings per chunk (when a provider is configured) and store JSON vectors in `chunks.embedding_vector`.
- Search embeds the query with the same provider and reranks FTS candidates when `queryEmbedding` is passed to `searchChunks`.

## Non-goals (this slice)

- Transformer / ONNX models (optional later; may imply asset download and disclosure).
- sqlite-vec or ANN index (candidates come from FTS first).

## Contracts

- **Provider**: `id`, `isLocal`, `dimension`, `embed(texts: string[])`.
- **Default**: `createHashProjectionEmbeddingProvider()` — 64-d pseudo-vectors; deterministic; not semantic retrieval.
- **Hybrid**: `alpha * ftsNorm + (1 - alpha) * cosine01` with `cosine01 = (cos + 1) / 2`; missing chunk embedding falls back to lexical only.

## Embedding backfill (legacy NULL rows)

Chunks created before embeddings shipped may have `embedding_vector IS NULL`. **`ensureChunkEmbeddingsUpToDate`** batches those rows, calls `provider.embed`, and `UPDATE`s in place (FTS unchanged). Runs after `ensureSearchIndexUpToDate` on desktop startup.

## Acceptance criteria

- `@foldur/embeddings` builds and tests pass.
- Import + search-index backfill can attach embeddings when `embeddingProvider` is passed.
- `searchChunks` supports `queryEmbedding` + optional `hybridAlpha` / `candidateMultiplier`.
- NULL-vector chunks are filled by `ensureChunkEmbeddingsUpToDate` without re-import.
