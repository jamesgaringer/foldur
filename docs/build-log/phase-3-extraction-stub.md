# Build log: Phase 3 — Extraction provider + title stub on import

**Date:** 2026-04-04
**Phase:** [Phase 3 — Intelligence layer](../roadmap.md) (partial)
**Spec:** [spec-phase3-extraction-stub.md](../spec-phase3-extraction-stub.md)

## Model / tool

**Model:** Not recorded

## Scope

Pluggable **`ExtractionProvider`**, deterministic **title stub** (one speculative project + evidence per titled session with a user message), wired into **import** after chunk indexing. Extends **`DatabasePort`** with `createProject` / `createEvidenceLink` for both SQLite and the pipeline mock DB.

## What we shipped

- **`@foldur/core`**: `ExtractionProvider`, `ProjectExtractionCandidate`, `NewEvidenceForProject`; `createNoopExtractionProvider`, `createTitleStubExtractionProvider`; unit tests for stubs.
- **`@foldur/pipeline`**: `persistSessionExtraction`; import loop calls extract after `createChunks` when `extractionProvider` is set; progress stage **`extracting`**; mock + Tauri adapters implement new port methods.
- **Desktop**: `defaultExtractionProvider` (title stub) passed with embedding on import; Import Center steps include **Extracting**.

## Key files / packages

| Area | Paths |
|------|--------|
| Spec | `docs/spec-phase3-extraction-stub.md` |
| Core | `packages/core/src/extraction-provider.ts`, `extraction-stubs.ts` |
| Pipeline | `packages/pipeline/src/persist-extraction.ts`, `import-orchestrator.ts`, `ports.ts`, `tauri-db-adapter.ts`, `tests/mock-db.ts` |
| Desktop | `apps/desktop/src/extraction-default.ts`, `stores/import-store.ts`, `pages/ImportCenter.tsx` |

## Addendum: startup backfill

- **`ensureSessionExtractionUpToDate`** (`packages/pipeline/src/extraction-backfill.ts`) walks all sessions, skips any that already have project evidence, runs the title stub, and persists results. Invoked from **`db-store`** after chunk embedding backfill.
- **`hasSessionProjectEvidence`** + **`listAllSessions`** in `@foldur/db` support efficient checks.
- Stub **fallback title**: first user line when `session.title` is empty.

## Follow-ups

- Project detail page + evidence list; replace stub with scored extraction when ready.
