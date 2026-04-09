# Build log: Phase 3 — Themes MVP

**Date:** 2026-04-04
**Phase:** [Phase 3 — Intelligence layer](../roadmap.md) (partial)
**Spec:** [spec-phase3-themes-mvp.md](../spec-phase3-themes-mvp.md)

## Model / tool

**Model:** Not recorded

## Scope

**`themes`** repository, **`hasSessionEvidenceOfType`** helper (project helper delegates to it), **`ensureThemesBackfillUpToDate`** after session extraction, **Themes** + **Theme detail** routes replacing the placeholder surface.

## Key files

| Area | Path |
|------|------|
| DB | `packages/db/src/repositories/themes.ts`, `evidence-links.ts` |
| Pipeline | `packages/pipeline/src/theme-backfill.ts` |
| Desktop | `apps/desktop/src/pages/ThemesPage.tsx`, `ThemeDetailPage.tsx`, `App.tsx`, `stores/db-store.ts` |

## Follow-ups

- Recurrence scoring and smarter clustering; optional UNIQUE(label) or normalized labels.
