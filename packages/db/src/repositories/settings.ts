import type Database from "@tauri-apps/plugin-sql";

export async function getSetting(
  db: Database,
  key: string,
): Promise<string | null> {
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM app_settings WHERE key = $1",
    [key],
  );
  return rows.length > 0 ? rows[0]!.value : null;
}

export async function setSetting(
  db: Database,
  key: string,
  value: string,
): Promise<void> {
  await db.execute(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    [key, value],
  );
}

export async function deleteSetting(
  db: Database,
  key: string,
): Promise<void> {
  await db.execute("DELETE FROM app_settings WHERE key = $1", [key]);
}
