# Spec: Phase 4 — Timeline MVP (chronological sessions + source filter)

## Purpose

Replace the Timeline placeholder with a **real chronological view** of imported sessions, with an optional **source** filter, using only normalized SQLite data (no entity overlays yet).

## User outcome

- `/timeline` lists sessions **newest first**, grouped by **calendar day** (local).
- Filter: **All sources** or a specific adapter source (chatgpt, generic, …).
- Optional **session date range** (`from` / `to` query params, `YYYY-MM-DD`), same date column semantics as Search: `COALESCE(started_at, created_at)`.
- Each row links to `/sessions/:id`.

## Non-goals

- Merge overlays, project/theme bands on the timeline, or zoom levels.
- Fancy date-range sliders (plain date inputs are enough for MVP).

## Contracts

- `listSessionsForTimeline(db, { sourceType?, dateFrom?, dateTo?, limit? })` returns `{ session, source_type }[]` ordered by `COALESCE(started_at, created_at)` descending, with optional filters on source type and inclusive calendar bounds on the same derived session date.

## Acceptance criteria

- Large libraries use a bounded SQL query (default limit).
- Unknown / empty `started_at` falls back to `created_at` for ordering and day grouping.
