# Build log: Phase 2 — Search UX, date filters, Home → session

**Date:** 2026-04-04  
**Phase:** [Phase 2 — Search and indexing](../roadmap.md) (follow-up slice)  
**Spec:** [spec-phase2-search.md](../spec-phase2-search.md)

## Model / tool

**Model:** Not recorded

## Scope

- Roadmap: search filters by **date**, **session reader** discoverability from **Home**, align spec with **startup backfill** for pre–Phase 2 imports.
- Related prior work in-repo: `/sessions/:sessionId` reader, search result links, `search_index_version` + `ensureSearchIndexUpToDate` (see [phase-2-search-indexing.md](./phase-2-search-indexing.md)).

## What we shipped

- **`searchChunks` date filters** (`packages/db`): optional `dateFrom` / `dateTo` (`YYYY-MM-DD`, inclusive) on `date(COALESCE(s.started_at, s.created_at))`; combined with existing FTS `MATCH` + optional `sourceType` via one dynamic `WHERE` clause.
- **Search UI** (`SearchPage.tsx`): optional “Session from / to” date inputs + helper copy.
- **Home** (`Home.tsx`): recent sessions are **links** to `/sessions/:id` with hover affordance.
- **Docs**: `spec-phase2-search.md` updated for date filters, session route, and backfill behavior; `roadmap.md` marks backfill item **done**.

## Key files / packages

| Area | Paths |
|------|--------|
| Search SQL | `packages/db/src/repositories/search.ts` (`SearchChunksOptions`) |
| Search UI | `apps/desktop/src/pages/SearchPage.tsx` |
| Home | `apps/desktop/src/pages/Home.tsx` |
| Spec / roadmap | `docs/spec-phase2-search.md`, `docs/roadmap.md` |

## Follow-ups

- Scroll-to / highlight matching message when opening a session from a specific search hit (query params or router state).
- Embeddings + hybrid retrieval (remaining Phase 2).
