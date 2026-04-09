import type { SourceType } from "./enums.js";
import type { NewArtifact } from "./schemas/artifact.js";
import type { NewMessage } from "./schemas/message.js";
import type { NewSession } from "./schemas/session.js";

export interface ParseWarningItem {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface RawParseResult {
  sourceType: SourceType;
  rawPayload: unknown;
  fileHash: string;
  fileName: string;
  warnings: ParseWarningItem[];
}

export interface NormalizedSession {
  session: NewSession;
  messages: NewMessage[];
  artifacts: NewArtifact[];
}

export interface NormalizeResult {
  sessions: NormalizedSession[];
  warnings: ParseWarningItem[];
}

export interface SourceAdapter {
  readonly sourceType: SourceType;
  readonly adapterVersion: string;

  canParse(data: ArrayBuffer, fileName: string): Promise<boolean>;
  parseRaw(data: ArrayBuffer, fileName: string): Promise<RawParseResult>;
  normalize(raw: RawParseResult, sourceId: string, importBatchId: string): NormalizeResult;
}
