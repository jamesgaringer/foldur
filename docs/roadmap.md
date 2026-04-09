# Foldur roadmap and build checklist

This is the working backlog for V1. It mirrors the phased plan from the product spec: **ship narrow slices end-to-end** (schema → pipeline → tests → UI) before layering intelligence.

**Legend:** `[x]` shipped in repo today · `[ ]` not started · `~` partial / stub only

---

## Phase 1 — Foundation (import path)

Goal: ingest exports locally, normalize to canonical rows, inspect imports.

| Item | Status |
|------|--------|
| Monorepo (pnpm, Turbo), Tauri + React + Vite | [x] |
| Canonical Zod schemas (`@foldur/core`) | [x] |
| SQLite + migrations + repositories (`@foldur/db`) | [x] |
| ChatGPT + generic adapters + tests | [x] |
| Import pipeline + `DatabasePort` + tests | [x] |
| Import Center UI (pick files, progress, history, warnings) | [x] |
| Home: library stats + recent sessions | [x] |
| Other nav tabs: stats + roadmap copy (not full features) | [~] |
| Claude adapter | [ ] |
| Cursor adapter | [ ] |

**Next to “start shipping” from here:** treat Phase 2 as the next vertical slice (see below).

---

## Phase 2 — Search and indexing

Goal: find anything in your history locally (FTS + optional embeddings).

| Item | Status |
|------|--------|
| Chunking strategy + `chunks` table population | [x] |
| SQLite FTS5 (or equivalent) on message/chunk text | [x] |
| Local embedding provider interface + first implementation | [x] |
| Hybrid retrieval (FTS + vectors + metadata filters) | [~] |
| Search UI (query, filters by source/date) | [x] |
| Incremental indexing on new import batches | [x] |
| Backfill chunks/FTS for imports done before Phase 2 | [x] |
| Backfill NULL chunk embeddings (legacy libraries) | [x] |

**Suggested order:** chunking → FTS → search UI → embeddings → hybrid retrieval → incremental reindex hooks.

---

## Phase 3 — Intelligence layer (grounded)

Goal: projects, themes, evidence links, recommendations — all traceable.

| Item | Status |
|------|--------|
| Extraction provider interface (local default) | [x] |
| Project / theme candidate extraction | [x] |
| Persist `EvidenceLink` for every derived entity | [~] |
| Project list + detail + evidence view in UI | [x] |
| Recommendation MVP (typed, scored, dismiss/accept) | [x] |
| “Why this exists” / rationale strings | [~] |

**Rule:** no derived rows without evidence links (per architecture rules).

---

## Phase 4 — Unification and timeline

Goal: merge related work across tools, show evolution.

| Item | Status |
|------|--------|
| Entity resolution module (candidates, merge scoring, decisions) | [x] |
| Merge persistence + provenance on merge | [x] |
| Timeline view + source + date filters | [x] |
| Incremental refresh (only affected batches / entities) | [ ] |

---

## Phase 5A — Smart tabs and intelligence enrichment

Goal: transform flat list views into insight-driven dashboards, enrich projects/themes with computed intelligence, generate data-driven recommendations, lay groundwork for model-powered providers.

| Item | Status |
|------|--------|
| Session analytics table + per-session metrics | [x] |
| Analytics repository (activity trends, enriched views) | [x] |
| Project enrichment backfill (status lifecycle, momentum, descriptions) | [x] |
| Theme enrichment backfill (recurrence scores, trends, descriptions) | [x] |
| Data-driven recommendation generator | [x] |
| Smart Home dashboard (sparkline, digests, recommendations) | [x] |
| Smart Projects page (status badges, momentum, filters, sort) | [x] |
| Smart Themes page (recurrence, trends, sort) | [x] |
| Smart Session viewer (summary card, keywords, related intelligence) | [x] |
| Smart Recommendations (grouped by type, priority-sorted) | [x] |
| Smart Timeline (activity density, project tags) | [x] |
| IntelligenceProvider interface + Settings page | [x] |
| Local model provider (Ollama) | [x] |
| Behavioral profiling engine (Ollama-powered) | [x] |
| Profile page (summary, patterns, evidence drill-down) | [x] |
| Settings persistence (app_settings table) | [x] |
| Remote model provider (OpenAI/Anthropic with opt-in) | [ ] |

---

## Phase 5B — More sources and hardening

| Item | Status |
|------|--------|
| Claude adapter | [ ] |
| Cursor adapter | [ ] |
| Optional encrypted storage / vault mode | [ ] |
| Provider settings UI (local vs remote, disclosure) | [x] |

---

## How we pick the next feature

1. **Spec in `/docs`** — short spec per feature (purpose, contracts, acceptance criteria) before large changes.
2. **One vertical slice** — e.g. “FTS search” touches `db` + `search` package + UI, not half of Phase 2 and half of Phase 3 at once.
3. **Tests at boundaries** — adapters, pipeline stages, scoring/merge when deterministic.

---

## Related docs

- [Build log (per phase)](./build-log/) — what shipped, key files, model used
- [Phase 2 search spec](./spec-phase2-search.md), [Phase 2 embeddings / hybrid](./spec-phase2-embeddings.md)
- [Phase 3 evidence persistence](./spec-phase3-evidence-persistence.md)
- [Phase 3 extraction stub](./spec-phase3-extraction-stub.md)
- [Phase 3 project detail](./spec-phase3-project-detail.md)
- [Phase 3 recommendations MVP](./spec-phase3-recommendations-mvp.md)
- [Phase 3 themes MVP](./spec-phase3-themes-mvp.md)
- [Phase 4 timeline MVP](./spec-phase4-timeline-mvp.md)
- [Phase 4 entity merge (scoring)](./spec-phase4-entity-merge.md)
- [Phase 4 merge persistence](./spec-phase4-merge-persistence.md)
- [Adapter contract](./adapter-contract.md)
- [ADR: SQLite](./adr/001-sqlite.md), [Tauri](./adr/002-tauri.md), [Adapters](./adr/003-adapter-architecture.md)
