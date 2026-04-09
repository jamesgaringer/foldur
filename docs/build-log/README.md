# Build log (per phase)

Each phase that ships a meaningful slice gets a **single markdown file** in this folder. Use it as an audit trail: what landed, where, and **which model** assisted (for your own records).

## When to add an entry

- After a **phase** or **major milestone** from the roadmap is complete, or a **clearly scoped feature chunk** (e.g. “Phase 2: search”, “backfill job”, “Claude adapter”).
- **Cursor / agent expectation:** completing a bounded feature or roadmap slice includes updating this build log (and the index below), not only code. See `.cursor/rules/build-log.mdc`.
- Keep one file per phase slice (e.g. `phase-2-search-indexing.md`), not one per commit.

## What to include

| Section | Purpose |
|--------|---------|
| **Phase / date** | Name and approximate completion date. |
| **Model / tool** | The AI model or assistant used (from your Cursor settings, chat header, or provider). If unknown, write `Not recorded`. |
| **Scope** | What roadmap items this covers (link to `docs/roadmap.md`). |
| **What we shipped** | Bullet list of user-visible and technical deliverables. |
| **Key files / packages** | Paths worth remembering for the next engineer or agent. |
| **Follow-ups** | Known gaps, tech debt, or next backlog items. |

## Model field (honesty)

The repository does **not** auto-inject the model name. Add it manually when you finish a phase, or paste from Cursor’s UI / chat metadata if you export it.

Example:

```markdown
**Model:** Claude Sonnet 4.5 (Cursor, April 2026)
```

---

## Index

| File | Phase | Summary |
|------|-------|---------|
| [phase-1-foundation.md](./phase-1-foundation.md) | Phase 1 | Monorepo, Tauri app, adapters, import pipeline, core UI |
| [phase-2-search-indexing.md](./phase-2-search-indexing.md) | Phase 2 (slice) | Chunking, FTS5, search UI, tests |
| [phase-2-search-ux-and-filters.md](./phase-2-search-ux-and-filters.md) | Phase 2 (slice) | Session reader links, search date filters, roadmap/spec sync |
| [phase-2-embeddings-hybrid.md](./phase-2-embeddings-hybrid.md) | Phase 2 (slice) | EmbeddingProvider, hash embeddings, hybrid search, import/backfill wiring |
| [phase-2-embedding-null-backfill.md](./phase-2-embedding-null-backfill.md) | Phase 2 (slice) | Startup job fills NULL chunk embeddings for legacy DBs |
| [phase-2-search-session-deeplink.md](./phase-2-search-session-deeplink.md) | Phase 2 (slice) | `?chunk=` deep link: scroll + highlight message or artifact |
| [phase-3-evidence-persistence.md](./phase-3-evidence-persistence.md) | Phase 3 (slice) | Project + evidence_link DB repos; Projects page lists local rows |
| [phase-3-extraction-stub.md](./phase-3-extraction-stub.md) | Phase 3 (slice) | ExtractionProvider, title stub on import, DatabasePort project/evidence |
| [phase-3-project-detail.md](./phase-3-project-detail.md) | Phase 3 (slice) | `/projects/:id` + evidence links into sessions |
| [phase-3-recommendations-mvp.md](./phase-3-recommendations-mvp.md) | Phase 3 (slice) | Recommendations repo, stub seed, dismiss/accept UI |
| [phase-3-themes-mvp.md](./phase-3-themes-mvp.md) | Phase 3 (slice) | Themes repo, label-based backfill, list + detail UI |
| [phase-3-home-library-stats.md](./phase-3-home-library-stats.md) | Phase 3 (small) | Home stats: projects, themes, open recommendations |
| [phase-4-timeline-mvp.md](./phase-4-timeline-mvp.md) | Phase 4 (slice) | Chronological timeline + source filter |
| [phase-4-entity-merge-scoring.md](./phase-4-entity-merge-scoring.md) | Phase 4 (slice) | Deterministic project merge scoring + candidate pairs in core |
| [phase-4-merge-persistence.md](./phase-4-merge-persistence.md) | Phase 4 (slice) | SQLite merge tables, repos, Projects merge UI, archived project banner |
| [codebase-review-fixes.md](./codebase-review-fixes.md) | Cross-cutting | Full audit: inverted BM25, zombie batches, stuck imports, schema fixes, accessibility, dedup |
| [phase-5a-smart-tabs.md](./phase-5a-smart-tabs.md) | Phase 5A | Smart tabs: analytics layer, project/theme enrichment, recommendation generator, all-page UI overhaul, provider abstraction, settings |
| [phase-5a-behavioral-profiling.md](./phase-5a-behavioral-profiling.md) | Phase 5A (slice) | Ollama integration, behavioral profiling pipeline, pattern storage, user profile, Profile page, settings persistence |

(Add new rows here when you add files.)
