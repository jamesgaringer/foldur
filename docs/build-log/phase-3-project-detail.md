# Build log: Phase 3 — Project detail page

**Date:** 2026-04-04
**Phase:** [Phase 3 — Intelligence layer](../roadmap.md) (partial)
**Spec:** [spec-phase3-project-detail.md](../spec-phase3-project-detail.md)

## Model / tool

**Model:** Not recorded

## Scope

Route **`/projects/:projectId`** with project metadata and **`listEvidenceLinksForEntity`** rows; links to **`/sessions/:id#message-…`** / **`#artifact-…`** for provenance. Project list rows link into detail.

## Key files

| Area | Path |
|------|------|
| UI | `apps/desktop/src/pages/ProjectDetailPage.tsx`, `ProjectsPage.tsx`, `App.tsx` |
| Spec | `docs/spec-phase3-project-detail.md` |

## Addendum: hash fragment highlight

- **`SessionPage`** reads `location.hash` for `#message-…` / `#artifact-…`, sets highlight + scroll (same UX as chunk links). Skipped when `?chunk=` or `q=` is present.

## Follow-ups

- Edit / merge projects (later Phase 3–4).
