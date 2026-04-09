# Build log: Phase 2 — NULL chunk embedding backfill

**Date:** 2026-04-04  
**Phase:** [Phase 2 — Search and indexing](../roadmap.md)  
**Spec:** [spec-phase2-embeddings.md](../spec-phase2-embeddings.md)

## Model / tool

**Model:** Not recorded

## Scope

Libraries indexed **before** per-chunk embeddings existed can have `chunks.embedding_vector IS NULL` even when `search_index_version` is current. This job fills those gaps **on startup** using the same default local provider as import—no re-import.

## What we shipped

- **DB** (`packages/db`): `listChunkTextBatchWithoutEmbedding`, `updateChunkEmbeddingVector`.
- **Pipeline** (`packages/pipeline`): `ensureChunkEmbeddingsUpToDate` — batched embed + update until no NULL rows remain.
- **Desktop** (`db-store.ts`): runs after `ensureSearchIndexUpToDate` and before `isReady`.
- **Tests**: pipeline unit tests with mocked `@foldur/db` repos.

## Key files

| Path |
|------|
| `packages/db/src/repositories/chunks.ts` |
| `packages/pipeline/src/embedding-backfill.ts` |
| `packages/pipeline/tests/embedding-backfill.test.ts` |
| `apps/desktop/src/stores/db-store.ts` |

## Follow-ups

- If the embedding **provider id** changes, add a migration or version column to force re-embed (currently only NULL rows are touched).
- Surface “embedding backfill running” in UI for very large libraries (optional progress).
