import type { Artifact, Message, NewChunk } from "@foldur/core";

const DEFAULT_MAX_CHARS = 8000;
const DEFAULT_OVERLAP = 200;

export function splitTextForChunks(
  text: string,
  maxChars = DEFAULT_MAX_CHARS,
  overlap = DEFAULT_OVERLAP,
): Array<{ start: number; end: number; text: string }> {
  if (maxChars <= 0) {
    throw new Error("maxChars must be greater than 0");
  }
  if (overlap >= maxChars) {
    throw new Error("overlap must be less than maxChars");
  }
  if (text.length === 0) return [];
  if (text.length <= maxChars) {
    return [{ start: 0, end: text.length, text }];
  }
  const out: Array<{ start: number; end: number; text: string }> = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    out.push({ start, end, text: text.slice(start, end) });
    if (end >= text.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return out;
}

export function chunksFromMessages(
  sessionId: string,
  messages: Message[],
): NewChunk[] {
  const out: NewChunk[] = [];
  for (const m of messages) {
    for (const part of splitTextForChunks(m.content_text)) {
      out.push({
        session_id: sessionId,
        message_id: m.id,
        artifact_id: null,
        chunk_type: "message",
        text: part.text,
        start_offset: part.start,
        end_offset: part.end,
        embedding_vector: null,
      });
    }
  }
  return out;
}

export function chunksFromArtifacts(
  sessionId: string,
  artifacts: Artifact[],
): NewChunk[] {
  const out: NewChunk[] = [];
  for (const a of artifacts) {
    for (const part of splitTextForChunks(a.content_text)) {
      out.push({
        session_id: sessionId,
        message_id: a.message_id,
        artifact_id: a.id,
        chunk_type: "artifact",
        text: part.text,
        start_offset: part.start,
        end_offset: part.end,
        embedding_vector: null,
      });
    }
  }
  return out;
}
