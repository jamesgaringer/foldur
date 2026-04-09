# Spec: Phase 2 — Chunking and full-text search

## Purpose

Let users find content across imported AI history using **local** full-text search (SQLite FTS5), aligned with the local-first ethos.

## User outcome

- After import, message (and artifact) text is **chunked**, stored in `chunks`, and indexed in **FTS5**.
- **Search** tab accepts a query and shows ranked snippets with session title and source type.
- Optional **source filter** (chatgpt, generic, …).
- Optional **session date range** (`YYYY-MM-DD`, inclusive) on `COALESCE(started_at, created_at)`.
- **Session reader** route (`/sessions/:id`) opened from search results or Home recent sessions.
- **Deep link from search**: `/sessions/:sessionId?chunk=:chunkId&q=:query` loads the chunk’s message or artifact, scrolls it into view, briefly rings it, and **highlights whitespace-separated query tokens** in message and artifact text (case-insensitive).

## Non-goals (this slice)

- Embeddings / semantic search (later Phase 2 item).
- Hybrid ranking with vectors.
- Re-indexing entire DB on schema change beyond forward migrations.

## Data contracts

- **Chunking**: deterministic splits on long text (`maxChars` / `overlap`); one chunk per short message.
- **FTS**: `chunks_fts` holds `chunk_id`, denormalized ids for filter/join, and `body` (searchable text).
- **Search**: parameterized `MATCH` query; user input escaped for FTS5 token syntax.

## Acceptance criteria

- New migration creates `chunks_fts`; existing DBs upgrade cleanly.
- Import pipeline creates chunks + FTS rows for new imports.
- Search returns results ordered by BM25 rank with session title and snippet.
- Unit tests for chunk splitting and FTS query escaping; pipeline test updated for chunk creation.

## Existing data before chunking

Imports completed **before** chunking shipped have **messages** but no **chunks** / FTS rows until **`ensureSearchIndexUpToDate`** runs on app startup (see `search_index_version` on `import_batches`). Re-import is not required for indexing once that job has run.

## Affected modules

- `packages/db` — migration `002_fts`, `chunks` + `search` repositories
- `packages/pipeline` — chunking + import orchestration
- `apps/desktop` — Search page, migration registration
