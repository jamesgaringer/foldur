# Build log: Phase 4 — Merge persistence + Projects UI

**Date:** 2026-04-04  
**Phase:** [Phase 4 — Unification and timeline](../roadmap.md) (partial)  
**Spec:** [spec-phase4-merge-persistence.md](../spec-phase4-merge-persistence.md)

## What shipped

- **Migration `004_project_merge`**: `project_merge_candidates`, `project_merge_decisions` (audit: survivor + merged id).
- **Core** Zod types: `ProjectMergeCandidateStored`, `ProjectMergeDecisionStored`.
- **Repositories** (`project-merge.ts`): `recomputeProjectMergeCandidates`, `listMergeCandidatesDetailed`, `mergeProjectsIntoCanonical` (transaction: evidence dedupe, decision row, archive merged, clear touching candidates), `getSurvivorProjectIdForMerged`.
- **`listProjects` / `countProjects`**: default excludes `archived`; `getLibraryStats` project count matches.
- **Desktop**: Projects page — scan + duplicate list + merge actions; project detail banner when viewing an archived merged-away project.

## Files

| Area | Path |
|------|------|
| Migration | `packages/db/src/migrations/004_project_merge.sql`, `apps/desktop/src/migrations/004_project_merge.sql` |
| Core | `packages/core/src/schemas/project-merge-persistence.ts` |
| DB | `packages/db/src/repositories/project-merge.ts`, `projects.ts`, `stats.ts`, `migrate.ts` |
| Desktop | `apps/desktop/src/stores/db-store.ts`, `pages/ProjectsPage.tsx`, `pages/ProjectDetailPage.tsx` |
| Tests | `packages/db/tests/project-merge.test.ts` |

## Follow-ups

- Incremental refresh of candidates after import; optional `EvidenceLink` for merge rationale; theme/goal merge.
