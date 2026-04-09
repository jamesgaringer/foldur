# Phase 5A — Smart Tabs: Local Intelligence Engine + UI Overhaul

**Date:** April 2026
**Model:** Not recorded
**Scope:** Roadmap Phase 5 (partial) — Intelligence enrichment, analytics, smart UI, provider groundwork

## What we shipped

### Analytics foundation
- New `session_analytics` table via migration `006_session_analytics.sql` with per-session message counts, word count, duration, top keywords
- `packages/db/src/repositories/analytics.ts` — 10+ SQL analytics queries: activity trends, enriched project/theme views, session intelligence, source distribution
- `packages/pipeline/src/session-analytics-backfill.ts` — incremental backfill with stopword-filtered keyword extraction (pure TS, no model calls)

### Project enrichment
- `packages/pipeline/src/project-enrichment.ts` — automatic status lifecycle (speculative → active → stalled), momentum scoring, description generation, confidence scaling, source span tracking
- `updateProjectEnrichment` repo method in projects.ts

### Theme enrichment
- `packages/pipeline/src/theme-enrichment.ts` — recurrence scoring, trend detection (rising/stable/declining), description generation, confidence scaling
- `updateThemeEnrichment` repo method in themes.ts

### Recommendation generator
- `packages/pipeline/src/recommendation-generator.ts` — replaces the one-shot seed with data-driven recommendations:
  - `revive_stalled` — stalled projects with 3+ sessions
  - `consolidate` — high-scoring merge candidates
  - `reflect_pattern` — rising themes with 5+ recent sessions
  - `revisit_decision` — substantial old sessions worth revisiting
- Idempotent: deduplicates by title, grounded with evidence links

### Smart tab UI (all pages)
- **Home**: multi-section dashboard with activity sparkline (30-day), "What you're working on" (top 5 projects with activity badges), top themes with trend arrows, recommendations callout, source distribution, collapsible recent sessions
- **Projects**: status badges (active/stalled/speculative), momentum bars, descriptions, session/source counts, filter by status, sort by activity/sessions/name
- **Project detail**: enriched metadata card (status, confidence, momentum, sessions, sources, first/last seen)
- **Themes**: session count badges, trend indicators (Rising/Stable/Declining), recurrence bars, sort by recurrence/recent/name
- **Theme detail**: metadata card (confidence, sessions, recurrence bar, first/last seen)
- **Session viewer**: summary card (message count, duration, word count), keyword pills, related intelligence panel (linked projects + themes)
- **Recommendations**: grouped by type into collapsible sections (Stalled Projects, Consolidation, Active Patterns, Worth Revisiting, Next Actions)
- **Timeline**: activity density bars per day, project annotation tags on session entries

### Provider abstraction + Settings
- `IntelligenceProvider` interface in `@foldur/core` extending `ExtractionProvider` with tier system, network/privacy metadata, optional rich methods
- Settings page (`/settings`) with 3-tier provider selector (Local Heuristic default, Local Model placeholder, Remote Model placeholder with privacy warning)
- Settings nav item added to AppShell

### Supporting
- `analytics-store.ts` — Zustand store wrapping analytics queries for all dashboard/page use
- `ActivitySparkline.tsx` — lightweight SVG sparkline component (no charting dependency)
- Fixed pre-existing build error in `import-orchestrator.ts` (`batch` possibly null)

## Key files / packages

| Area | Key files |
|------|-----------|
| Migration | `apps/desktop/src/migrations/006_session_analytics.sql` |
| DB analytics | `packages/db/src/repositories/analytics.ts` |
| Project enrichment | `packages/pipeline/src/project-enrichment.ts` |
| Theme enrichment | `packages/pipeline/src/theme-enrichment.ts` |
| Recommendation gen | `packages/pipeline/src/recommendation-generator.ts` |
| Session analytics | `packages/pipeline/src/session-analytics-backfill.ts` |
| Analytics store | `apps/desktop/src/stores/analytics-store.ts` |
| Sparkline component | `apps/desktop/src/components/ActivitySparkline.tsx` |
| Settings page | `apps/desktop/src/pages/SettingsPage.tsx` |
| Provider types | `packages/core/src/extraction-provider.ts` |
| Updated pages | `Home.tsx`, `ProjectsPage.tsx`, `ProjectDetailPage.tsx`, `ThemesPage.tsx`, `ThemeDetailPage.tsx`, `SessionPage.tsx`, `RecommendationsPage.tsx`, `TimelinePage.tsx` |

## Follow-ups

- Implement local model provider (Ollama integration) — Tier 2
- Implement remote model provider (OpenAI/Anthropic) — Tier 3 with opt-in
- Persist Settings page selections to DB or local config
- Richer keyword extraction (TF-IDF, n-grams, or model-powered)
- Theme deduplication by keyword overlap (not just exact label match)
- Goals, Interests, Patterns entities — require semantic analysis from a model provider
- Incremental refresh on import (only re-enrich affected entities)
- Activity sparkline: tooltip on hover showing exact date/count
