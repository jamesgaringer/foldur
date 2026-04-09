# Build log: Phase 4 — Entity merge scoring (core)

**Date:** 2026-04-04  
**Phase:** [Phase 4 — Unification and timeline](../roadmap.md) (partial)  
**Spec:** [spec-phase4-entity-merge.md](../spec-phase4-entity-merge.md)

## What shipped

- **`ProjectMergeScoringInput`** and **`MergeScoreBreakdown`** Zod schemas (`packages/core/src/schemas/merge-scoring.ts`).
- **`scoreProjectMerge`** — deterministic title (token Jaccard), optional description Jaccard, temporal IoU on `[first_seen_at, last_seen_at]`; fixed weights with renormalization when description is skipped.
- **`listProjectMergeCandidates`** — thresholded unordered pairs, sorted by `combined`, capped.
- Unit tests in `packages/core/tests/merge-scoring.test.ts`.

## Files

| Area | Path |
|------|------|
| Core | `packages/core/src/merge-scoring.ts`, `packages/core/src/schemas/merge-scoring.ts`, `packages/core/src/index.ts` |
| Tests | `packages/core/tests/merge-scoring.test.ts` |

## Follow-ups

- Persist merge decisions + provenance; wire candidates from DB; optional UI review queue.
