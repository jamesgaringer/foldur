# Build log: Phase 2 — Search and indexing (first slice)

**Date:** 2026-04-04 (approx.)
**Phase:** [Phase 2 — Search and indexing](../roadmap.md) (partial)
**Spec:** [spec-phase2-search.md](../spec-phase2-search.md)

## Model / tool

**Model:** Composer 2 Fast

## Scope

This slice covers the **first vertical** of Phase 2: chunked storage, SQLite FTS5, and a searchable UI—**not** embeddings or hybrid vector retrieval yet.

## What we shipped

- **Chunking** (`packages/pipeline`): deterministic splitting of long text; message and artifact chunks with offsets; wired into import after messages/artifacts persist.
- **SQLite FTS5**: migration `002_fts`, virtual table `chunks_fts` with `chunk_id`, `session_id`, `message_id`, `source_id`, `body` (indexed).
- **Repositories** (`packages/db`): `createChunk` / `createChunks` (writes `chunks` + `chunks_fts`); `ftsMatchQueryFromUserInput`, `searchChunks` (BM25, optional source filter).
- **Library stats**: `chunkCount` in aggregate stats; UI stats bar shows “Chunks”.
- **Search UI** (`apps/desktop`): `/search` with query, source filter, debounced search, result snippets with session title and BM25 score.
- **Import progress**: added an **indexing** stage in the import flow.
- **Tests**: FTS query escaping, chunking unit tests, pipeline tests updated for chunks + indexing.
- **Docs**: `spec-phase2-search.md`, roadmap checkboxes updated.

## Key files / packages

| Area | Paths |
|------|--------|
| Spec | `docs/spec-phase2-search.md` |
| Migration | `packages/db/src/migrations/002_fts.sql`, `apps/desktop/src/migrations/002_fts.sql` |
| Chunking | `packages/pipeline/src/chunking.ts` |
| Import orchestration | `packages/pipeline/src/import-orchestrator.ts` |
| DB | `packages/db/src/repositories/chunks.ts`, `search.ts` |
| Stats | `packages/db/src/repositories/stats.ts` |
| Desktop shell | `apps/desktop/src/stores/db-store.ts`, `pages/SearchPage.tsx`, `App.tsx` |
| Progress UI | `apps/desktop/src/pages/ImportCenter.tsx` |

## Follow-ups

- Embeddings + hybrid retrieval (remaining Phase 2 items).
- Date filters in search UI → shipped in [phase-2-search-ux-and-filters.md](./phase-2-search-ux-and-filters.md).

## Addendum: search index version + startup backfill

- **`import_batches.search_index_version`** (migration `003_search_index_version`) records the pipeline version applied to each batch (`SEARCH_INDEX_VERSION` in `@foldur/core`).
- **Startup:** `ensureSearchIndexUpToDate` runs after migrations in `db-store` and rebuilds chunks/FTS for any completed batch below the current version (including pre–Phase 2 imports).
- **UI:** Import history shows a **Search index** column (`v{n}` when current, **Pending** while below version — usually cleared before the UI loads because backfill runs before `isReady`).
