import type Database from "@tauri-apps/plugin-sql";
import type { EntityType, EvidenceLink, NewEvidenceLink } from "@foldur/core";
import { EvidenceLinkSchema, generateId, nowISO } from "@foldur/core";

export async function createEvidenceLink(
  db: Database,
  input: NewEvidenceLink,
): Promise<EvidenceLink> {
  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO evidence_links
     (id, entity_type, entity_id, session_id, message_id, artifact_id, chunk_id,
      excerpt, explanation, evidence_score, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      input.entity_type,
      input.entity_id,
      input.session_id,
      input.message_id,
      input.artifact_id,
      input.chunk_id,
      input.excerpt,
      input.explanation,
      input.evidence_score,
      now,
    ],
  );

  return EvidenceLinkSchema.parse({
    id,
    ...input,
    created_at: now,
  });
}

export async function listEvidenceLinksForEntity(
  db: Database,
  entityType: EntityType,
  entityId: string,
): Promise<EvidenceLink[]> {
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM evidence_links
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC`,
    [entityType, entityId],
  );
  return rows.map((r) => EvidenceLinkSchema.parse(r));
}

export async function listEvidenceLinksForSession(
  db: Database,
  sessionId: string,
): Promise<EvidenceLink[]> {
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM evidence_links WHERE session_id = $1 ORDER BY created_at DESC`,
    [sessionId],
  );
  return rows.map((r) => EvidenceLinkSchema.parse(r));
}

/** True if this session already has an evidence row for the given entity type. */
export async function hasSessionEvidenceOfType(
  db: Database,
  sessionId: string,
  entityType: EntityType,
): Promise<boolean> {
  const rows = await db.select<{ cnt: number }[]>(
    `SELECT COUNT(*) as cnt FROM evidence_links
     WHERE session_id = $1 AND entity_type = $2`,
    [sessionId, entityType],
  );
  return (rows[0]?.cnt ?? 0) > 0;
}

/** True if this session already has project-scoped evidence (stub or future extractors). */
export async function hasSessionProjectEvidence(
  db: Database,
  sessionId: string,
): Promise<boolean> {
  return hasSessionEvidenceOfType(db, sessionId, "project");
}
