import type Database from "@tauri-apps/plugin-sql";

export interface UserProfile {
  id: string;
  summary: string;
  strengths: string[];
  growth_areas: string[];
  work_style: string | null;
  model_used: string | null;
  session_count_at_computation: number | null;
  computed_at: string;
}

export interface UpsertUserProfileInput {
  summary: string;
  strengths: string[];
  growth_areas: string[];
  work_style: string | null;
  model_used: string | null;
  session_count_at_computation: number | null;
}

export async function getUserProfile(
  db: Database,
): Promise<UserProfile | null> {
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM user_profile WHERE id = 'default' LIMIT 1",
  );
  if (rows.length === 0) return null;
  const r = rows[0]!;
  return {
    id: String(r.id),
    summary: String(r.summary),
    strengths: parseJsonArray(r.strengths_json),
    growth_areas: parseJsonArray(r.growth_areas_json),
    work_style: r.work_style != null ? String(r.work_style) : null,
    model_used: r.model_used != null ? String(r.model_used) : null,
    session_count_at_computation:
      r.session_count_at_computation != null
        ? Number(r.session_count_at_computation)
        : null,
    computed_at: String(r.computed_at),
  };
}

export async function upsertUserProfile(
  db: Database,
  input: UpsertUserProfileInput,
): Promise<void> {
  await db.execute(
    `INSERT INTO user_profile
     (id, summary, strengths_json, growth_areas_json, work_style, model_used, session_count_at_computation, computed_at)
     VALUES ('default', $1, $2, $3, $4, $5, $6, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       summary = excluded.summary,
       strengths_json = excluded.strengths_json,
       growth_areas_json = excluded.growth_areas_json,
       work_style = excluded.work_style,
       model_used = excluded.model_used,
       session_count_at_computation = excluded.session_count_at_computation,
       computed_at = excluded.computed_at`,
    [
      input.summary,
      JSON.stringify(input.strengths),
      JSON.stringify(input.growth_areas),
      input.work_style,
      input.model_used,
      input.session_count_at_computation,
    ],
  );
}

function parseJsonArray(raw: unknown): string[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}
