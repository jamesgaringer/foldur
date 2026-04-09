# Spec: Phase 3 — Extraction provider + title stub on import

## Purpose

Introduce a pluggable **`ExtractionProvider`** (parallel to `EmbeddingProvider`) so intelligence can be computed locally with explicit opt-in for future remote extractors. Ship a **deterministic title stub** that creates one speculative project per session plus one evidence link to the first user message—proving end-to-end persistence without an LLM.

## User outcome

- Import runs an optional **extract** step after chunk indexing (and embedding when configured).
- With the default **title stub**, new imports produce **projects** and **evidence links** users can see on the Projects tab.
- **Startup backfill** (`ensureSessionExtractionUpToDate`) runs for sessions that have **no project-scoped evidence yet**, so libraries imported before extraction shipped are filled in without re-import.
- **No network**; stub is fully local and reproducible.

## Non-goals

- Semantic or model-based extraction.

## Contracts

- **`ExtractionProvider`**: `id`, `isLocal`, `extractSession({ session, messages, artifacts })` → `ProjectExtractionCandidate[]` (each bundles `NewProject` + evidence rows without `entity_id` / `entity_type`).
- **`DatabasePort`**: `createProject`, `createEvidenceLink` (implemented by SQLite adapter and test mock).
- **`createNoopExtractionProvider`**: returns no candidates.
- **Title stub**: uses `session.title` when set; otherwise the first **120 characters** of the first **user** message (trimmed). Sessions with no user message produce no project.
- **Idempotency**: a session is skipped if `evidence_links` already contains a row for that `session_id` with `entity_type = 'project'`.

## Acceptance criteria

- Import with title stub creates at least one project + evidence when sessions have titles and user messages.
- Import without provider leaves intelligence tables unchanged (aside from prior data).
- Unit tests for stub logic and import + mock DB with extraction.
- Desktop startup runs backfill after embeddings; re-opening the app does not duplicate projects for sessions already extracted.
