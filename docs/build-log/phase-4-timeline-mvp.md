# Build log: Phase 4 — Timeline MVP

**Date:** 2026-04-04
**Phase:** [Phase 4 — Unification and timeline](../roadmap.md) (partial)
**Spec:** [spec-phase4-timeline-mvp.md](../spec-phase4-timeline-mvp.md)

## What shipped

- **`listSessionsForTimeline`** (`sessions` repo): join `sources`, `ORDER BY` `COALESCE(started_at, created_at)` DESC, optional `source` and optional **inclusive date range** on the same derived session date (aligned with Search), bounded limit.
- **`TimelinePage`** at `/timeline`: day groups (local calendar), source dropdown, **`from` / `to` URL-backed date inputs**, links to session reader.
- Removed Surface placeholder for the timeline route.

## Files

| Area | Path |
|------|------|
| DB | `packages/db/src/repositories/sessions.ts` |
| Desktop | `apps/desktop/src/pages/TimelinePage.tsx`, `App.tsx` |

## Follow-ups

- Entity overlays on the timeline; merge indicators.
