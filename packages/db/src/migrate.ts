import type Database from "@tauri-apps/plugin-sql";

const MIGRATION_TABLE_SQL =
  "CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT NOT NULL DEFAULT (datetime('now')))";

interface MigrationEntry {
  name: string;
}

const migrations: MigrationEntry[] = [
  { name: "001_initial" },
  { name: "002_fts" },
  { name: "003_search_index_version" },
  { name: "004_project_merge" },
  { name: "005_merge_candidate_indexes" },
  { name: "006_session_analytics" },
  { name: "007_behavioral_profile" },
];

function extractStatements(sql: string): string[] {
  const stripped = sql
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      return trimmed.startsWith("--") ? "" : line;
    })
    .join("\n");

  return stripped
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function runMigrations(
  db: Database,
  migrationSql: Record<string, string>,
): Promise<void> {
  await db.execute(MIGRATION_TABLE_SQL);

  const applied = await db.select<{ name: string }[]>(
    "SELECT name FROM _migrations ORDER BY id",
  );
  const appliedSet = new Set(applied.map((r) => r.name));

  for (const migration of migrations) {
    if (appliedSet.has(migration.name)) continue;

    const sql = migrationSql[migration.name];
    if (!sql) {
      throw new Error(`Migration SQL not found for: ${migration.name}`);
    }

    const statements = extractStatements(sql);

    for (const statement of statements) {
      await db.execute(statement);
    }

    await db.execute("INSERT INTO _migrations (name) VALUES ($1)", [
      migration.name,
    ]);
  }
}
