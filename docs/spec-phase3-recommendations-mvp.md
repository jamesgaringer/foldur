# Spec: Phase 3 — Recommendations MVP

## Purpose

Surface **typed, scored recommendations** with **dismiss / accept** actions and **EvidenceLink** provenance, using the existing `recommendations` + `evidence_links` tables.

## User outcome

- **Recommendations** nav shows open items (not dismissed or accepted).
- Each row shows title, rationale, type, scores, and a link to grounded evidence (session/message).
- **Dismiss** sets `dismissed_at`; **Accept** sets `accepted_at`.
- **Startup stub**: if the library has **projects** but **zero recommendation rows ever**, create one seeded `next_action` plus one evidence link (idempotent: never re-seed after the first row exists).

## Non-goals

- ML ranking or remote generation.
- Editing recommendation text in UI.

## Contracts

- Repositories: `createRecommendation`, `countRecommendations`, `listOpenRecommendations`, `dismissRecommendation`, `acceptRecommendation`, `getRecommendationById`.
- Evidence: every created recommendation must have ≥1 `EvidenceLink` with `entity_type = 'recommendation'`.

## Acceptance criteria

- Dismiss/accept persist and remove items from the open list.
- Stub runs after session extraction backfill; does not duplicate once any recommendation row exists.
