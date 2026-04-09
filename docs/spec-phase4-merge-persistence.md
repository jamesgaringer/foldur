# Spec: Phase 4 — Merge persistence + provenance

## Purpose

Persist **merge candidate pairs** (refreshed from deterministic scoring) and **record merge decisions** when the user consolidates two projects, with **evidence rewiring** and an **audit row** for the absorbed project.

## User outcome

- Suggested duplicate pairs are stored after a **recompute** (bounded library size) and listed in the UI with scores.
- Choosing a canonical project **merges** the other: evidence links move to the survivor, duplicate anchors are dropped, the absorbed project is **`archived`**, and a **decision row** records the mapping for redirects.

## Non-goals

- Automatic merges without user action.
- Theme/goal merge; transitive merge chains beyond one hop in UI (DB allows lookup from merged id → survivor).

## Contracts

### Tables

- **`project_merge_candidates`** — latest batch of suggestions; `project_a_id` &lt; `project_b_id` lexicographically; score columns mirror `MergeScoreBreakdown`; `computed_at` ISO.
- **`project_merge_decisions`** — `merged_project_id` unique (each project absorbed at most once in MVP); `surviving_project_id` is the canonical project; optional `notes`.

### Repositories

- `recomputeProjectMergeCandidates(db)` — loads active projects (non-`archived`), caps count for scoring, clears candidates, inserts new rows. Returns counts for logging.
- `listMergeCandidatesDetailed(db)` — candidates joined to titles for display; skips pairs if either side is missing (stale).
- `mergeProjectsIntoCanonical(db, survivorId, mergedId)` — transaction: validate ids; reassign or dedupe evidence; insert decision; archive merged; delete candidate rows touching either id.
- `getSurvivorProjectIdForMerged(db, mergedProjectId)` — for detail-page redirect banner.

### Provenance

- Merge is justified by existing evidence on both sides; the **decision row** is the operational audit trail (`decided_at`, optional `notes`). No new `EvidenceLink` required for MVP (optional follow-up: link to a session explaining the merge).

## Acceptance criteria

- Migrations apply on desktop startup.
- `listProjects` / `countProjects` / library stats exclude **`archived`** projects by default (optional `includeArchived` for tooling).
- Tests cover merge SQL shape and merge flow with mocked DB where practical.
