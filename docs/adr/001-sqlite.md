# ADR 001: SQLite for Local Storage

## Status

Accepted

## Context

Foldur is a local-first desktop application that needs a relational database for storing imported AI conversation history, normalized canonical entities, derived intelligence objects, and provenance links. The database must work offline, require zero external infrastructure, and be easy to package with a desktop app.

## Decision

Use SQLite as the sole database for V1, accessed through the Tauri SQL plugin (`@tauri-apps/plugin-sql` / `tauri-plugin-sql` on the Rust side). The plugin uses `sqlx` with SQLite, managing connections in the Rust backend. TypeScript code interacts with the database through Tauri IPC.

## Rationale

- **Zero infrastructure**: SQLite is an embedded database. No server process, no port management, no daemon.
- **Local-first alignment**: The database file lives alongside user data on their machine. Easy to inspect, back up, move, or delete.
- **Tauri integration**: The official Tauri SQL plugin provides first-class SQLite support with migrations, parameterized queries, and connection pooling.
- **Sufficient for V1 scale**: A single user's AI conversation history (tens of thousands of messages) fits comfortably in SQLite performance characteristics.
- **Future extensibility**: SQLite supports FTS5 for full-text search (Phase 2) and can be paired with vector extensions for embeddings.

## Alternatives Considered

- **PostgreSQL**: Overkill for a single-user desktop app. Requires a running server process, complicating packaging and the local-first story.
- **IndexedDB / localStorage**: Too limited for relational queries, JOIN operations, and the structured schema we need.
- **sql.js (WASM SQLite)**: Would run entirely in the webview without needing a Tauri plugin, but has performance limitations and makes the database harder to access from Rust-side operations.
- **Drizzle ORM**: Considered for type-safe query building, but adds complexity and doesn't have a clean integration path with Tauri's SQL plugin. Raw SQL with Zod validation at boundaries provides adequate type safety for V1.

## Consequences

- All database queries are written as raw SQL strings. This means no compile-time query validation, but Zod schemas at repository boundaries catch shape mismatches at runtime.
- The database file (`foldur.db`) is unencrypted by default. Optional encryption is planned for Phase 5.
- Migrations are managed as numbered `.sql` files, applied sequentially by a custom migration runner.
