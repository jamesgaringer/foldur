# Build log: Phase 3 — Recommendations MVP

**Date:** 2026-04-04
**Phase:** [Phase 3 — Intelligence layer](../roadmap.md) (partial)
**Spec:** [spec-phase3-recommendations-mvp.md](../spec-phase3-recommendations-mvp.md)

## Model / tool

**Model:** Not recorded

## Scope

SQLite repositories for **`recommendations`**, **startup stub** that inserts one onboarding recommendation + **EvidenceLink** when `COUNT(recommendations)=0` and projects exist, and a **Recommendations** nav page with dismiss/accept.

## Key files

| Area | Path |
|------|------|
| DB | `packages/db/src/repositories/recommendations.ts`, `projects.ts` (`countProjects`) |
| Pipeline | `packages/pipeline/src/recommendation-stub-backfill.ts` |
| Desktop | `apps/desktop/src/pages/RecommendationsPage.tsx`, `App.tsx`, `AppShell.tsx`, `stores/db-store.ts` |

## Follow-ups

- Non-stub recommendations from extraction; richer rationale strings in UI.
