# Spec: Phase 3 — Project and evidence persistence (repository layer)

## Purpose

Expose the existing SQLite `projects` and `evidence_links` tables through typed `@foldur/db` repositories so extraction and UI can persist grounded intelligence without ad hoc SQL.

## User outcome

- Callers can **create** and **list** projects and evidence links using **Zod-validated** types from `@foldur/core`.
- The **Projects** nav route shows **real rows** from the database (empty state until extraction populates them).

## Non-goals (this slice)

- Running extraction or LLM passes over sessions.
- Project merge, themes, or recommendations.

## Contracts

- `createProject` / `listProjects` / `getProjectById`
- `createEvidenceLink` / `listEvidenceLinksForEntity` / `listEvidenceLinksForSession`
- All reads return `Project` / `EvidenceLink` via schema parse.

## Acceptance criteria

- Repositories build and match `001_initial.sql` column sets.
- Unit tests cover insert + list parsing with mocked `Database` (`execute` / `select`).
- Projects page loads from `listProjects` when the local DB is ready.
