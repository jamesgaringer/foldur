import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

/**
 * Reduce "database is locked" (SQLITE_BUSY): WAL allows concurrent readers; busy_timeout
 * retries when another statement briefly holds the lock (e.g. import, FTS, merge).
 */
export async function configureSqliteConnection(conn: Database): Promise<void> {
  await conn.execute("PRAGMA foreign_keys = ON");
  await conn.execute("PRAGMA journal_mode = WAL");
  await conn.execute("PRAGMA synchronous = NORMAL");
  await conn.execute("PRAGMA busy_timeout = 20000");
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:foldur.db");
    await configureSqliteConnection(db);
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    const ref = db;
    db = null;
    await ref.close();
  }
}
