# Adapter Contract

This document defines the contract that every source adapter must satisfy.

## Interface

Every adapter implements `SourceAdapter` from `@foldur/core`:

```typescript
interface SourceAdapter {
  readonly sourceType: SourceType;
  readonly adapterVersion: string;

  canParse(data: ArrayBuffer, fileName: string): Promise<boolean>;
  parseRaw(data: ArrayBuffer, fileName: string): Promise<RawParseResult>;
  normalize(raw: RawParseResult, sourceId: string, importBatchId: string): NormalizeResult;
}
```

## Method Contracts

### `canParse(data, fileName)`

- Must return `true` only if this adapter can handle the given file.
- Should be fast -- check file extension, magic bytes, or top-level JSON structure only.
- Must not throw. Return `false` on any uncertainty.
- Must not consume or modify the data buffer.

### `parseRaw(data, fileName)`

- Validates and parses the source-specific format.
- Returns the raw parsed payload, file hash, and any warnings.
- May throw on unrecoverable format errors (invalid JSON, completely wrong structure).
- Must compute a content hash for duplicate detection.

### `normalize(raw, sourceId, importBatchId)`

- Converts source-specific data into canonical `Session[]`, `Message[]`, and `Artifact[]`.
- All returned messages must have `session_id` set to a temporary placeholder (`__session_N`). The pipeline replaces this with the real ID after session insertion.
- Messages must have sequential `sort_order` values.
- Messages must have `content_hash` computed via `hashContent()`.
- Must emit `ParseWarning[]` for recoverable issues rather than throwing.
- Must not depend on any database or external state.

## Output Types

### `RawParseResult`
```typescript
{
  sourceType: SourceType;
  rawPayload: unknown;       // source-specific parsed data
  fileHash: string;          // content hash for deduplication
  fileName: string;
  warnings: ParseWarningItem[];
}
```

### `NormalizeResult`
```typescript
{
  sessions: NormalizedSession[];  // each contains session + messages + artifacts
  warnings: ParseWarningItem[];  // accumulated warnings
}
```

### `ParseWarningItem`
```typescript
{
  code: string;              // machine-readable warning code
  message: string;           // human-readable description
  context?: Record<string, unknown>;  // optional structured context
}
```

## Warning Code Conventions

Warning codes should be prefixed with the adapter name in SCREAMING_SNAKE_CASE:

- `CHATGPT_CONVERSATION_PARSE_ERROR`
- `CHATGPT_EMPTY_CONVERSATION`
- `CHATGPT_NO_ROOT_NODE`
- `GENERIC_MARKDOWN_NO_MESSAGES`
- `GENERIC_CONVERSATION_PARSE_ERROR`

## Testing Requirements

Every adapter must have fixture-based tests that verify:

1. `canParse` returns `true` for valid files and `false` for invalid ones
2. `parseRaw` produces the expected raw structure
3. `normalize` produces the correct number of sessions and messages
4. Message roles, timestamps, and sort order are correct
5. Artifacts (code blocks, etc.) are extracted
6. Warnings are emitted for edge cases (empty conversations, missing timestamps)
7. External IDs and metadata are preserved

## Registration

Adapters are registered in `packages/adapters/src/registry.ts`. More specific adapters must come before generic ones in the array, because `detectAdapter()` returns the first match.
