# Build log: Phase 3 — Evidence and project repositories + Projects page

**Date:** 2026-04-04
**Phase:** [Phase 3 — Intelligence layer](../roadmap.md) (partial)
**Spec:** [spec-phase3-evidence-persistence.md](../spec-phase3-evidence-persistence.md)

## Model / tool

**Model:** Not recorded

## Scope

Wire the existing `projects` and `evidence_links` tables through `@foldur/db` and replace the Projects placeholder surface with a real list view (empty until extraction writes rows).

## What we shipped

- **Repositories** (`packages/db`): `createProject`, `getProjectById`, `listProjects`; `createEvidenceLink`, `listEvidenceLinksForEntity`, `listEvidenceLinksForSession` — all return Zod-parsed `@foldur/core` types.
- **Tests**: mocked `Database` coverage for create/list paths (`tests/projects-evidence.test.ts`).
- **Desktop**: `/projects` renders `ProjectsPage` — loads `listProjects` when SQLite is ready; empty and non-Tauri copy consistent with Home/Search.

## Key files / packages

| Area | Paths |
|------|--------|
| Spec | `docs/spec-phase3-evidence-persistence.md` |
| Repos | `packages/db/src/repositories/projects.ts`, `evidence-links.ts` |
| UI | `apps/desktop/src/pages/ProjectsPage.tsx`, `App.tsx` |

## Follow-ups

- Extraction provider + pipeline stage to populate projects and evidence links from sessions.
- Project detail route with evidence list (`listEvidenceLinksForEntity`).
- Enforce “no derived entity without evidence” at the pipeline boundary once extraction exists.
