# Build log: Phase 2 — Search → session deep link (`?chunk=`)

**Date:** 2026-04-04  
**Phase:** [Phase 2 — Search and indexing](../roadmap.md)  
**Spec:** [spec-phase2-search.md](../spec-phase2-search.md)

## Model / tool

**Model:** Not recorded

## Scope

Close the loop from **search hit** to **exact context** in the conversation: scroll + short highlight, without re-querying inside the session view.

## What we shipped

- **`getChunkById`** (`packages/db/src/repositories/chunks.ts`) — load a chunk row for `session_id` / `message_id` / `artifact_id` checks.
- **Search results** link to `/sessions/:sessionId?chunk=:chunkId&q=:query` (`URLSearchParams`; `q` omitted if the search box is empty).
- **Session page** reads `chunk`, resolves highlight: artifact chunks prefer `artifact-${id}` DOM id; else `message-${id}`; **smooth scroll** + **ring** for ~4.5s.
- **`q`**: `highlightQueryTokens` in `apps/desktop/src/utils/highlight-query.tsx` wraps token matches in `<mark>` (amber tint) across message bodies and artifact `pre` content.
- **Docs**: `spec-phase2-search.md` updated; this log entry + index.

## Key files

| Path |
|------|
| `packages/db/src/repositories/chunks.ts` |
| `apps/desktop/src/pages/SearchPage.tsx` |
| `apps/desktop/src/pages/SessionPage.tsx` |
| `apps/desktop/src/utils/highlight-query.tsx` |

## Follow-ups

- Virtualized long threads: ensure scroll targets stay valid.
- Smarter tokenization if users adopt FTS phrase syntax in the search box.
