# Spec: Phase 4 — Entity merge (scoring + candidates)

## Purpose

Provide a **deterministic, testable** layer to suggest when two **projects** might be the same initiative across imports or tools, without calling remote models. Persistence of merge decisions and provenance is a separate slice.

## User / system outcome

- Given two project records (minimal fields), compute a **0–1 merge score** with a transparent breakdown (title, description, time span).
- Given a list of projects, enumerate **candidate pairs** above a threshold for review or future UI.

## Non-goals (this slice)

- SQLite tables for merge decisions, `EvidenceLink` rewiring, or UI.
- Session-level or theme-level merge (projects only for now).
- Learned / embedding-based merge scores (may be added later behind explicit provider opt-in).

## Contracts

### Input: `ProjectMergeScoringInput`

Subset of `Project`: `id`, `canonical_title`, `description`, `first_seen_at`, `last_seen_at` (ISO strings).

### Output: `MergeScoreBreakdown`

- `title_similarity` — token-set Jaccard on normalized words (length ≥ 2).
- `description_similarity` — same, or `null` when the pair does not use description (see below).
- `temporal_overlap` — interval overlap over union (IoU) on `[first_seen_at, last_seen_at]` parsed as UTC; invalid ordering repaired.
- `combined` — weighted combination with fixed weights; when description is omitted, **weights are renormalized** onto the remaining signals only.

**Weights (when all three signals apply):** title `0.5`, description `0.25`, temporal `0.25`.

**Description omitted** when either side has no non-empty trimmed description: do not penalize; renormalize title + temporal (proportionally to their original weights → title `2/3`, temporal `1/3`).

### Pairing

- `scoreProjectMerge(a, b)` throws if `a.id === b.id`.
- `listProjectMergeCandidates(projects, { minCombined?, maxPairs? })` considers each unordered pair once (`id` order), filters by `minCombined` (default `0.55`), sorts by `combined` descending, returns at most `maxPairs` (default `500`).

## Acceptance criteria

- Same inputs always yield the same outputs (no randomness, no clock).
- Unit tests cover: identical titles, disjoint titles, temporal overlap extremes, description on/off, same-id error, candidate listing order and cap.

## Related

- Storage and merge execution: [spec-phase4-merge-persistence.md](./spec-phase4-merge-persistence.md).
