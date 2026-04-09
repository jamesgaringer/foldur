import type Database from "@tauri-apps/plugin-sql";
import type { Artifact, NewArtifact } from "@foldur/core";
import { ArtifactSchema, generateId, nowISO } from "@foldur/core";

export async function createArtifact(
  db: Database,
  artifact: NewArtifact,
): Promise<Artifact> {
  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO artifacts
     (id, session_id, message_id, artifact_type, title, content_text, mime_type, raw_payload_json, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      artifact.session_id,
      artifact.message_id,
      artifact.artifact_type,
      artifact.title,
      artifact.content_text,
      artifact.mime_type,
      artifact.raw_payload_json,
      now,
    ],
  );

  return ArtifactSchema.parse({ id, ...artifact, created_at: now });
}

export async function createArtifacts(
  db: Database,
  artifacts: NewArtifact[],
): Promise<Artifact[]> {
  const created: Artifact[] = [];
  for (const artifact of artifacts) {
    created.push(await createArtifact(db, artifact));
  }
  return created;
}

export async function getArtifactsBySession(
  db: Database,
  sessionId: string,
): Promise<Artifact[]> {
  const rows = await db.select<Artifact[]>(
    "SELECT * FROM artifacts WHERE session_id = $1 ORDER BY created_at",
    [sessionId],
  );
  return rows.map((r) => ArtifactSchema.parse(r));
}
