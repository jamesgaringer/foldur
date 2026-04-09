# Codebase review and bug fixes

**Date:** April 2026
**Model:** Not recorded
**Scope:** Full-project audit and fix pass across all packages

## What we shipped

### Critical bug fixes
- **Inverted BM25 normalization** in hybrid search reranking (`packages/db/src/repositories/search.ts`): worst FTS matches were scoring highest. Now best matches rank first.
- **Import store stuck forever** (`apps/desktop/src/stores/import-store.ts`): if `importFile` threw, `isImporting` was never reset. Wrapped in `try/catch/finally`.
- **Silent DB init failure** (`apps/desktop/src/App.tsx`): database errors were ignored — now displayed as a global error banner. Added a 404 catch-all route.
- **Zombie import batches** (`packages/pipeline/src/import-orchestrator.ts`): failed imports left batches in "parsing" status permanently. Now explicitly set to "failed" in the catch block. Also wrapped `completePipelineRun` in nested try/catch to avoid masking original errors.
- **Spread-order override** (`packages/pipeline/src/persist-extraction.ts`): `entity_type`/`entity_id` could be overridden by excess properties on evidence objects. Flipped spread order.
- **`maxSessions` semantic bug** (`packages/pipeline/src/extraction-backfill.ts`): counter incremented for *scanned* sessions, not *backfilled* ones. Now only counts actual work.
- **Search-index crash window** (`packages/pipeline/src/search-index-backfill.ts`): all chunks for a batch were deleted upfront, then recreated one session at a time. A mid-run crash left sessions with zero chunks. Changed to per-session delete+recreate.

### Schema and type fixes
- **`SourceSchema`** now includes `created_at`/`updated_at` to match the DDL.
- **`NewRecommendation`** no longer includes `dismissed_at`/`accepted_at` — these are lifecycle fields that belong to the repository layer.
- **`getSourceByType`** parameter typed as `SourceType` instead of bare `string`.
- **`WarningDrawer`** context type updated to `Record<string, unknown> | string | null` to match core's `ParseWarningItem`.

### Logic and safety fixes
- **Temporal IoU** for merge scoring: zero-width same-point intervals now return 1 (coincident) instead of 0.
- **Chunking guards**: `maxChars <= 0` and `overlap >= maxChars` now throw immediately instead of infinite-looping or O(n^2) degradation.
- **`closeDatabase`** nulls the singleton *before* calling `close()` to prevent stale-connection usage on failure.
- **Connection param shadow** renamed from `db` to `conn` in `configureSqliteConnection`.
- **Embedding backfill error message** now reports actual vs expected count instead of only saying "fewer."

### Desktop app improvements
- **Stats grid** changed from `grid-cols-6` (9 items leaving orphans) to responsive `grid-cols-3 xl:grid-cols-5`.
- **Path splitting** uses `[\\/]` regex to handle Windows backslash paths from Tauri's `open` dialog.
- **Button type** added `type="button"` to Browse files button to prevent accidental form submission.
- **Accessibility**: nav gets `aria-label`, decorative icons get `aria-hidden`, WarningDrawer gets `role="dialog"` + `aria-modal` + Escape key handling + close button `aria-label`.
- **Color contrast**: `--color-text-muted` lightened from `#5c6178` (~2.8:1) to `#8891a8` (~4.5:1 WCAG AA).
- **Extracted duplicated code**: `evidenceHref` (3 pages) and `SOURCE_OPTIONS` (2 pages) moved to shared utils.

## Key files changed

| Package | Files |
|---------|-------|
| `packages/core` | `schemas/source.ts`, `schemas/recommendation.ts`, `merge-scoring.ts` |
| `packages/db` | `repositories/search.ts`, `repositories/sources.ts`, `repositories/recommendations.ts`, `connection.ts` |
| `packages/pipeline` | `import-orchestrator.ts`, `persist-extraction.ts`, `extraction-backfill.ts`, `chunking.ts`, `search-index-backfill.ts`, `embedding-backfill.ts`, `recommendation-stub-backfill.ts` |
| `packages/ui` | `components/WarningDrawer.tsx` |
| `apps/desktop` | `App.tsx`, `stores/import-store.ts`, `index.css`, `components/AppShell.tsx`, `components/LibraryStatsBar.tsx`, `pages/ImportCenter.tsx`, `pages/ProjectDetailPage.tsx`, `pages/ThemeDetailPage.tsx`, `pages/RecommendationsPage.tsx`, `pages/SearchPage.tsx`, `pages/TimelinePage.tsx` |
| `apps/desktop` (new) | `utils/evidence-href.ts`, `utils/source-options.ts` |
| tests | `packages/db/tests/recommendations.test.ts`, `packages/pipeline/tests/mock-db.ts` |

## Follow-ups (not addressed in this pass)

- **ChatGPT ZIP extraction** uses heuristic text scanning instead of a proper ZIP library — fragile for compressed entries.
- **ChatGPT branch traversal** walks all children instead of following `current_node` — interleaves deleted branches.
- **ChatGPT author role enum** rejects unknown roles instead of gracefully degrading.
- **Batch inserts** (messages, artifacts, chunks, parse-warnings) are not wrapped in transactions.
- **`DatabasePort`** abstraction is bypassed by most backfill functions — they import `@foldur/db` directly, making them untestable without a real Tauri SQLite database.
- **`stats.ts`** runs 9 sequential COUNT queries instead of a single combined query.
- **No React error boundary** in the desktop app.
- **FileDropZone** has no hidden `<input type="file">`, no keyboard support, no `accept` validation.
- **DataTable** clickable rows have no keyboard support.
- **`hashContent`** uses a 32-bit hash with high collision probability at scale.
