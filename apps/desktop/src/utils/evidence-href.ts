import type { EvidenceLink } from "@foldur/core";

export function evidenceHref(e: EvidenceLink): string {
  const base = `/sessions/${e.session_id}`;
  if (e.message_id) return `${base}#message-${e.message_id}`;
  if (e.artifact_id) return `${base}#artifact-${e.artifact_id}`;
  return base;
}
