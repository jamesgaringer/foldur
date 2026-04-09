# Build log: Phase 2 — Embeddings + hybrid search

**Date:** 2026-04-04  
**Phase:** [Phase 2 — Search and indexing](../roadmap.md)  
**Spec:** [spec-phase2-embeddings.md](../spec-phase2-embeddings.md)

## Model / tool

**Model:** Not recorded

## Scope

- **`EmbeddingProvider`** in `@foldur/core` + `parseEmbeddingVector` / `cosineSimilarity`.
- **`@foldur/embeddings`**: `createHashProjectionEmbeddingProvider()` (64-d deterministic local pseudo-embeddings; no network).
- **Pipeline**: `applyEmbeddingsToChunks`, optional provider on `importFile` / `importFiles` (`ImportFileOptions`), progress stage **`embedding`**, backfill via `ensureSearchIndexUpToDate(db, { embeddingProvider })`.
- **`searchChunks`**: optional `queryEmbedding`, `hybridAlpha`, `candidateMultiplier` — FTS candidate pool then lexical–vector blend.
- **Desktop**: `defaultEmbeddingProvider` wired for import, DB init backfill, and Search page query embedding.

## Key files / packages

| Area | Paths |
|------|--------|
| Core | `packages/core/src/embedding-provider.ts`, `embedding-utils.ts` |
| Embeddings | `packages/embeddings/src/hash-projection.ts` |
| Pipeline | `packages/pipeline/src/embed-chunks.ts`, `import-orchestrator.ts`, `search-index-backfill.ts` |
| DB | `packages/db/src/repositories/search.ts` |
| Desktop | `apps/desktop/src/embedding-default.ts`, `stores/db-store.ts`, `stores/import-store.ts`, `pages/SearchPage.tsx`, `pages/ImportCenter.tsx`, `vite.config.ts` |
| Spec | `docs/spec-phase2-embeddings.md` |

## Follow-ups

- Real semantic embeddings (e.g. transformers.js or native) behind explicit opt-in + disclosure if assets download.
- sqlite-vec / ANN for large libraries; tune hybrid weights in UI.
- Mark chunks stale when provider `id` / dimension changes (re-embed job).
