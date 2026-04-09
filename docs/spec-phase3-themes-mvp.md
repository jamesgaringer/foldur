# Spec: Phase 3 — Themes MVP (stub backfill + UI)

## Purpose

Expose **`themes`** with **EvidenceLink** provenance and a minimal **list + detail** UI, using a **deterministic backfill** that groups sessions by a label derived from the session title (or first user line) without an LLM.

## User outcome

- Startup job creates **theme** rows and **theme** evidence for sessions that do not yet have theme-scoped evidence.
- **Themes** nav lists themes; **detail** shows evidence with links into sessions.
- Multiple sessions sharing the same label attach to the **same** theme (multiple evidence rows).

## Non-goals

- Semantic clustering or embedding-based themes.
- Editing theme labels in UI.

## Contracts

- Repositories: `createTheme`, `getThemeById`, `getThemeByLabel`, `listThemes`, `countThemes`.
- `hasSessionEvidenceOfType(sessionId, entityType)` for idempotent per-session skips.
- Backfill runs after session extraction, before recommendation stub.

## Acceptance criteria

- Themes page shows rows from SQLite; detail lists `listEvidenceLinksForEntity(..., "theme", id)`.
- Re-running startup does not duplicate evidence for a session that already has theme evidence.
