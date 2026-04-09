import type Database from "@tauri-apps/plugin-sql";

export interface LibraryStats {
  sessionCount: number;
  messageCount: number;
  artifactCount: number;
  chunkCount: number;
  completedImportCount: number;
  sourceCount: number;
  /** Intelligence layer (local stubs + evidence-backed rows). */
  projectCount: number;
  themeCount: number;
  openRecommendationsCount: number;
}

export async function getLibraryStats(db: Database): Promise<LibraryStats> {
  const sessionRows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM sessions",
  );
  const messageRows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM messages",
  );
  const artifactRows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM artifacts",
  );
  const importRows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM import_batches WHERE status = 'completed'",
  );
  const sourceRows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM sources",
  );
  const chunkRows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM chunks",
  );
  const projectRows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM projects WHERE status != 'archived'",
  );
  const themeRows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM themes",
  );
  const openRecRows = await db.select<{ cnt: number }[]>(
    `SELECT COUNT(*) as cnt FROM recommendations
     WHERE dismissed_at IS NULL AND accepted_at IS NULL`,
  );

  return {
    sessionCount: sessionRows[0]?.cnt ?? 0,
    messageCount: messageRows[0]?.cnt ?? 0,
    artifactCount: artifactRows[0]?.cnt ?? 0,
    chunkCount: chunkRows[0]?.cnt ?? 0,
    completedImportCount: importRows[0]?.cnt ?? 0,
    sourceCount: sourceRows[0]?.cnt ?? 0,
    projectCount: projectRows[0]?.cnt ?? 0,
    themeCount: themeRows[0]?.cnt ?? 0,
    openRecommendationsCount: openRecRows[0]?.cnt ?? 0,
  };
}

export interface SessionSummary {
  id: string;
  title: string | null;
  started_at: string | null;
  source_type: string;
  created_at: string;
}

export async function getRecentSessions(
  db: Database,
  limit: number,
): Promise<SessionSummary[]> {
  const rows = await db.select<
    {
      id: string;
      title: string | null;
      started_at: string | null;
      created_at: string;
      source_type: string;
    }[]
  >(
    `SELECT s.id, s.title, s.started_at, s.created_at, src.type AS source_type
     FROM sessions s
     JOIN sources src ON s.source_id = src.id
     ORDER BY datetime(s.created_at) DESC
     LIMIT $1`,
    [limit],
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    started_at: r.started_at,
    created_at: r.created_at,
    source_type: r.source_type,
  }));
}
