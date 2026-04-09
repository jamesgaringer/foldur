# ADR 003: Source Adapter Architecture

## Status

Accepted

## Context

Foldur ingests AI conversation history from multiple sources (ChatGPT, Claude, Cursor, generic formats). Each source has a different export format. The system must be source-agnostic internally -- downstream logic (search, intelligence extraction, recommendations) should never depend on source-specific data shapes.

## Decision

Use a formal adapter pattern with a shared `SourceAdapter` interface. Each source gets its own adapter that validates, parses, and normalizes data into canonical types. An adapter registry provides detection-based routing.

## Adapter Interface

```typescript
interface SourceAdapter {
  readonly sourceType: SourceType;
  readonly adapterVersion: string;
  canParse(data: ArrayBuffer, fileName: string): Promise<boolean>;
  parseRaw(data: ArrayBuffer, fileName: string): Promise<RawParseResult>;
  normalize(raw: RawParseResult, sourceId: string, importBatchId: string): NormalizeResult;
}
```

## Key Design Rules

1. **Adapters normalize early**: Raw source payloads are converted to canonical `Session`, `Message`, and `Artifact` types at the adapter boundary. Nothing downstream sees ChatGPT-specific or Claude-specific structures.

2. **Raw data is preserved**: The `parseRaw` step captures the original payload and file hash. The raw import is stored locally for debugging and reprocessing.

3. **Warnings, not crashes**: Adapters emit `ParseWarning[]` for recoverable issues (missing timestamps, empty messages, unexpected fields) rather than throwing. Only truly unrecoverable format errors should throw.

4. **Detection before parsing**: `canParse()` does a lightweight format check (file extension, magic bytes, top-level structure) to route files to the correct adapter without full parsing.

5. **Versioned adapters**: Each adapter declares its version. Import batches record which adapter version produced them, enabling future reprocessing when adapters improve.

## V1 Adapters

- **ChatGPTAdapter**: Handles `.json` and `.zip` ChatGPT exports. Walks the `mapping` tree to reconstruct linear message order. Extracts code blocks as artifacts.
- **GenericAdapter**: Handles simple JSON message arrays, wrapped JSON conversations, and markdown with `## User` / `## Assistant` headers. Serves as the fallback for unsupported sources.

## Future Adapters (Designed For, Not Yet Implemented)

- **ClaudeAdapter**: For Claude conversation exports.
- **CursorAdapter**: For Cursor session transcripts.

## Consequences

- Adding a new source requires implementing the `SourceAdapter` interface and registering it -- no changes to pipeline, DB, or UI code.
- The adapter registry tries adapters in order, so more specific adapters (ChatGPT) must be checked before generic ones.
- The canonical schema must be expressive enough to represent concepts from all sources. When a source has data that doesn't map cleanly, it should go in `metadata_json` rather than being lost.
