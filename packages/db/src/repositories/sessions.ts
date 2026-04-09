import type Database from "@tauri-apps/plugin-sql";
import type { Session, NewSession } from "@foldur/core";
import { SessionSchema, generateId, nowISO } from "@foldur/core";

export async function createSession(
  db: Database,
  session: NewSession,
): Promise<Session> {
  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO sessions
     (id, source_id, import_batch_id, external_id, title, started_at, ended_at, session_type, metadata_json, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      session.source_id,
      session.import_batch_id,
      session.external_id,
      session.title,
      session.started_at,
      session.ended_at,
      session.session_type,
      session.metadata_json,
      now,
      now,
    ],
  );

  return SessionSchema.parse({ id, ...session, created_at: now, updated_at: now });
}

export async function getSessionById(
  db: Database,
  id: string,
): Promise<Session | null> {
  const rows = await db.select<Session[]>(
    "SELECT * FROM sessions WHERE id = $1",
    [id],
  );
  return rows.length > 0 ? SessionSchema.parse(rows[0]) : null;
}

export async function getSessionsByBatch(
  db: Database,
  importBatchId: string,
): Promise<Session[]> {
  const rows = await db.select<Session[]>(
    "SELECT * FROM sessions WHERE import_batch_id = $1 ORDER BY started_at",
    [importBatchId],
  );
  return rows.map((r) => SessionSchema.parse(r));
}

export async function listAllSessions(db: Database): Promise<Session[]> {
  const rows = await db.select<Session[]>(
    "SELECT * FROM sessions ORDER BY COALESCE(started_at, created_at) DESC",
  );
  return rows.map((r) => SessionSchema.parse(r));
}

export interface SessionWithSourceType {
  session: Session;
  source_type: string;
}

/**
 * Sessions for the timeline UI: newest first, optional source and session-date filters
 * (same date semantics as search: `COALESCE(started_at, created_at)`), bounded result set.
 */
export async function listSessionsForTimeline(
  db: Database,
  options?: {
    sourceType?: string | null;
    /** Inclusive lower bound `YYYY-MM-DD` on session date. */
    dateFrom?: string | null;
    /** Inclusive upper bound `YYYY-MM-DD` on session date. */
    dateTo?: string | null;
    limit?: number;
  },
): Promise<SessionWithSourceType[]> {
  const limit = options?.limit ?? 5000;
  const st = options?.sourceType?.trim();
  const dateFrom = options?.dateFrom?.trim();
  const dateTo = options?.dateTo?.trim();

  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (st) {
    conditions.push(`src.type = $${i}`);
    params.push(st);
    i++;
  }
  if (dateFrom) {
    conditions.push(
      `date(COALESCE(s.started_at, s.created_at)) >= date($${i})`,
    );
    params.push(dateFrom);
    i++;
  }
  if (dateTo) {
    conditions.push(
      `date(COALESCE(s.started_at, s.created_at)) <= date($${i})`,
    );
    params.push(dateTo);
    i++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  params.push(limit);
  const limitPlaceholder = `$${i}`;

  const sql = `SELECT s.*, src.type AS source_type
     FROM sessions s
     JOIN sources src ON s.source_id = src.id
     ${whereClause}
     ORDER BY datetime(COALESCE(s.started_at, s.created_at)) DESC
     LIMIT ${limitPlaceholder}`;

  const rows = await db.select<Record<string, unknown>[]>(sql, params);
  return rows.map((r) => ({
    session: SessionSchema.parse(r),
    source_type: String(r.source_type ?? ""),
  }));
}

export async function getSessionCount(db: Database): Promise<number> {
  const rows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM sessions",
  );
  return rows[0]?.cnt ?? 0;
}
