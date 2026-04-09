# foldur

**Local-first personal intelligence** over your AI conversation history — not just storage, but **structure, signals, and suggestions** you can act on.

Import exports from ChatGPT (and generic sources today). Foldur normalizes everything into a **canonical model**, then layers **analytics**, **projects and themes** with momentum and recurrence, **data-driven recommendations**, **search** (full-text + local embeddings), **timeline** views, and **merge tools** for duplicate projects. Optional **Ollama** runs on your machine for deeper **behavioral profiling** and pattern cards, still tied to evidence from real sessions.

All of that stays **on your device** unless you explicitly turn on a remote provider (not required for core features).

## What it does

| Capability | What you get |
|------------|----------------|
| **Import & normalize** | Ingest exports into sessions, messages, and artifacts with provenance (batch, source, timestamps). |
| **Session analytics** | Per-session stats: message mix, duration, word counts, topic keywords — fuel for dashboards and profiling digests. |
| **Projects & themes** | Extracted and **enriched** with status (e.g. active / stalled), momentum, descriptions, and theme recurrence / trends. |
| **Patterns & profile** | Optional local LLM (Ollama) builds a **profile summary** and **behavioral / cognitive / workflow** patterns, each **linked to sessions** as evidence. |
| **Recommendations** | Typed, scored suggestions (e.g. revive stalled work, consolidate duplicates, revisit rich sessions) generated from your data — dismiss or accept in the UI. |
| **Search & browse** | FTS + hybrid retrieval over chunks; filters by source and date. |
| **Timeline** | Chronological view with activity density and links to related projects. |
| **Unification** | Merge candidate detection and **merge** flows for overlapping projects, with archived duplicates and evidence preserved. |

Everything derived is designed to remain **evidence-grounded**: intelligence links back to the conversations that support it.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Rust](https://rustup.rs/) (for Tauri)
- [pnpm](https://pnpm.io/) >= 10

### Setup

```bash
pnpm install
```

### Development

```bash
# Run the desktop app (Tauri + Vite dev server)
cd apps/desktop
pnpm tauri dev

# Run tests across all packages
pnpm test
```

### Optional: Ollama (behavioral profiling)

For the **Profile** tab and LLM-backed pattern analysis, install [Ollama](https://ollama.com/), pull a model (e.g. `ollama pull llama3.2`), then in the app choose **Settings → Local Model (Ollama)** and use **Test connection**. Heuristic-only mode works without Ollama.

### Project Structure

```
apps/
  desktop/          Tauri 2 desktop app (React + Vite + TypeScript)

packages/
  core/             Canonical types, Zod schemas, domain helpers
  db/               SQLite migrations, repository layer
  adapters/         Source adapters (ChatGPT, generic; more planned)
  pipeline/         Import orchestration, normalization, enrichment, profiling
  ui/               Shared React components
  config/           Shared TypeScript and tooling configs

docs/               Specs, ADRs, adapter contracts, roadmap, build log
```

## Roadmap

Ship order and feature checklist: **[docs/roadmap.md](docs/roadmap.md)** (Phase 1–5, done vs next).

Per-phase build notes: **[docs/build-log/](docs/build-log/)**.

## Architecture

- **Local-first**: Data and processing stay on your device by default. No cloud sync, no content telemetry.
- **Source-agnostic**: A canonical schema normalizes data from each adapter; downstream code does not depend on raw ChatGPT/Claude/Cursor formats.
- **Evidence-grounded**: Derived entities (projects, themes, patterns, recommendations) trace to sessions/messages/chunks via evidence links where the pipeline creates them.
- **Layered intelligence**: Raw imports → normalized sessions → analytics and enrichment → recommendations and optional local-model insights.
- **Open source**: Core engine and app shell are MIT-licensed and inspectable.

## License

MIT
