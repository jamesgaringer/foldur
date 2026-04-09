# Phase 5A (slice) — Behavioral Profiling Engine

**Date:** April 2026
**Model:** Not recorded

## Scope

- Roadmap: "Local model provider (Ollama)" from Phase 5A
- New feature: deep behavioral profiling powered by Ollama

## What we shipped

- **Ollama integration** — `OllamaProvider` class implementing `IntelligenceProvider` with health checks, chat completion, JSON mode, session summarization, topic extraction, and description generation. Full error handling (connection refused, timeout, model not found).
- **Behavioral profiling pipeline** — `runBehavioralProfile` stage that gathers session digests (titles, keywords, analytics, content snippets), batches them for Ollama, sends a detailed behavioral analysis prompt, parses structured JSON responses, and writes results to the DB.
- **Pattern storage** — new `patterns.ts` repository (CRUD for the existing `patterns` table) to store behavioral/cognitive/workflow/temporal patterns with confidence and impact scores. Each pattern linked to evidence sessions via `evidence_links`.
- **User profile** — new `user_profile` table and repository storing an LLM-generated narrative summary, strengths, growth areas, and work style descriptor.
- **Settings persistence** — new `app_settings` table and repository (key-value store). Settings page now persists intelligence tier, Ollama URL, model name, and remote provider config to the DB. Added "Test Connection" button that queries Ollama's `/api/tags` endpoint and displays available models.
- **Profile page** — new flagship `/profile` route with: profile summary card, work style display, strengths/growth areas columns, behavioral pattern cards with confidence/impact bars and expandable evidence drill-down. Context-aware empty states (not configured, Ollama not running, ready to analyze).
- **Non-blocking startup** — behavioral profiling runs in background after DB init when tier is `local-model`. Status exposed via `profilingStatus` in the db store and displayed as a banner on the Profile page.
- **Migration 007** — `app_settings` + `user_profile` tables.

## Key files / packages

| Package | Path | Purpose |
|---------|------|---------|
| `@foldur/db` | `packages/db/src/repositories/patterns.ts` | Pattern CRUD |
| `@foldur/db` | `packages/db/src/repositories/settings.ts` | Key-value settings |
| `@foldur/db` | `packages/db/src/repositories/user-profile.ts` | User profile read/write |
| `@foldur/pipeline` | `packages/pipeline/src/ollama-provider.ts` | Ollama HTTP client + IntelligenceProvider |
| `@foldur/pipeline` | `packages/pipeline/src/behavioral-profiler.ts` | Behavioral profiling pipeline stage |
| Desktop | `apps/desktop/src/pages/ProfilePage.tsx` | Profile page UI |
| Desktop | `apps/desktop/src/stores/profile-store.ts` | Profile + patterns state |
| Desktop | `apps/desktop/src/pages/SettingsPage.tsx` | Rewritten with persistence + connection test |
| Desktop | `apps/desktop/src/stores/db-store.ts` | Non-blocking profiling integration |
| Migration | `apps/desktop/src/migrations/007_behavioral_profile.sql` | New tables |

## Follow-ups

- Remote model provider (OpenAI/Anthropic) — UI placeholder exists, implementation deferred.
- Full message text analysis (currently uses titles + keywords + first user message snippet for context limits).
- Incremental profiling — currently re-analyzes all sessions; could track which sessions were already profiled.
- Pattern trend tracking over time (re-runs showing confidence changes).
- Claude and Cursor adapters (separate roadmap item).
