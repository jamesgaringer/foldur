import type Database from "@tauri-apps/plugin-sql";

export interface SessionProfile {
  session_id: string;
  message_count: number;
  user_msg_count: number;
  assistant_msg_count: number;
  word_count: number;
  duration_minutes: number | null;
  top_keywords: string[];
}

export async function getSessionProfile(
  db: Database,
  sessionId: string,
): Promise<SessionProfile | null> {
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM session_analytics WHERE session_id = $1",
    [sessionId],
  );
  if (rows.length === 0) return null;
  const r = rows[0]!;
  return {
    session_id: String(r.session_id),
    message_count: Number(r.message_count ?? 0),
    user_msg_count: Number(r.user_msg_count ?? 0),
    assistant_msg_count: Number(r.assistant_msg_count ?? 0),
    word_count: Number(r.word_count ?? 0),
    duration_minutes: r.duration_minutes != null ? Number(r.duration_minutes) : null,
    top_keywords: parseKeywordsJson(r.top_keywords_json),
  };
}

export interface ActivityTrendPoint {
  date: string;
  count: number;
}

export async function getActivityTrend(
  db: Database,
  days: number,
): Promise<ActivityTrendPoint[]> {
  const rows = await db.select<{ day: string; cnt: number }[]>(
    `SELECT date(COALESCE(s.started_at, s.created_at)) AS day,
            COUNT(*) AS cnt
     FROM sessions s
     WHERE date(COALESCE(s.started_at, s.created_at)) >= date('now', '-' || $1 || ' days')
     GROUP BY day
     ORDER BY day ASC`,
    [days],
  );
  return rows.map((r) => ({ date: r.day, count: r.cnt }));
}

export type ActivityLevel = "hot" | "warm" | "cold";

export interface ProjectWithActivity {
  id: string;
  canonical_title: string;
  description: string | null;
  status: string;
  confidence: number;
  momentum_score: number | null;
  first_seen_at: string;
  last_seen_at: string;
  source_span_count: number;
  evidence_count: number;
  session_count: number;
  days_since_last_activity: number;
  activity_level: ActivityLevel;
}

export async function getProjectsWithActivity(
  db: Database,
  options?: { includeArchived?: boolean },
): Promise<ProjectWithActivity[]> {
  const archiveFilter = options?.includeArchived
    ? ""
    : "WHERE p.status != 'archived'";

  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT p.*,
            COUNT(DISTINCT el.id) AS evidence_count,
            COUNT(DISTINCT el.session_id) AS session_count,
            CAST(julianday('now') - julianday(p.last_seen_at) AS INTEGER) AS days_since_last_activity
     FROM projects p
     LEFT JOIN evidence_links el ON el.entity_type = 'project' AND el.entity_id = p.id
     ${archiveFilter}
     GROUP BY p.id
     ORDER BY p.last_seen_at DESC`,
  );

  return rows.map((r) => {
    const daysSince = Number(r.days_since_last_activity ?? 999);
    const momentum = r.momentum_score != null ? Number(r.momentum_score) : null;
    let activity_level: ActivityLevel = "cold";
    if (daysSince <= 7 || (momentum != null && momentum > 0.5)) {
      activity_level = "hot";
    } else if (daysSince <= 30 || (momentum != null && momentum > 0.2)) {
      activity_level = "warm";
    }

    return {
      id: String(r.id),
      canonical_title: String(r.canonical_title),
      description: r.description != null ? String(r.description) : null,
      status: String(r.status),
      confidence: Number(r.confidence ?? 0.5),
      momentum_score: momentum,
      first_seen_at: String(r.first_seen_at),
      last_seen_at: String(r.last_seen_at),
      source_span_count: Number(r.source_span_count ?? 0),
      evidence_count: Number(r.evidence_count ?? 0),
      session_count: Number(r.session_count ?? 0),
      days_since_last_activity: daysSince,
      activity_level,
    };
  });
}

export async function getTopActiveProjects(
  db: Database,
  limit: number,
): Promise<ProjectWithActivity[]> {
  const all = await getProjectsWithActivity(db);
  return all
    .filter((p) => p.status !== "archived")
    .sort((a, b) => {
      const aScore = (a.momentum_score ?? 0) + (a.activity_level === "hot" ? 1 : a.activity_level === "warm" ? 0.5 : 0);
      const bScore = (b.momentum_score ?? 0) + (b.activity_level === "hot" ? 1 : b.activity_level === "warm" ? 0.5 : 0);
      return bScore - aScore;
    })
    .slice(0, limit);
}

export interface ThemeWithRecurrence {
  id: string;
  label: string;
  description: string | null;
  confidence: number;
  recurrence_score: number | null;
  first_seen_at: string;
  last_seen_at: string;
  session_count: number;
  recent_count: number;
  prior_count: number;
  trend: "rising" | "stable" | "declining";
}

export async function getThemesWithRecurrence(
  db: Database,
): Promise<ThemeWithRecurrence[]> {
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT t.*,
            COUNT(DISTINCT el.session_id) AS session_count,
            SUM(CASE WHEN date(el.created_at) >= date('now', '-14 days') THEN 1 ELSE 0 END) AS recent_count,
            SUM(CASE WHEN date(el.created_at) < date('now', '-14 days')
                      AND date(el.created_at) >= date('now', '-28 days') THEN 1 ELSE 0 END) AS prior_count
     FROM themes t
     LEFT JOIN evidence_links el ON el.entity_type = 'theme' AND el.entity_id = t.id
     GROUP BY t.id
     ORDER BY session_count DESC, t.last_seen_at DESC`,
  );

  return rows.map((r) => {
    const recent = Number(r.recent_count ?? 0);
    const prior = Number(r.prior_count ?? 0);
    let trend: "rising" | "stable" | "declining" = "stable";
    if (recent > prior + 1) trend = "rising";
    else if (prior > recent + 1) trend = "declining";

    return {
      id: String(r.id),
      label: String(r.label),
      description: r.description != null ? String(r.description) : null,
      confidence: Number(r.confidence ?? 0.5),
      recurrence_score: r.recurrence_score != null ? Number(r.recurrence_score) : null,
      first_seen_at: String(r.first_seen_at),
      last_seen_at: String(r.last_seen_at),
      session_count: Number(r.session_count ?? 0),
      recent_count: recent,
      prior_count: prior,
      trend,
    };
  });
}

export async function getTopRecurringThemes(
  db: Database,
  limit: number,
): Promise<ThemeWithRecurrence[]> {
  const all = await getThemesWithRecurrence(db);
  return all.slice(0, limit);
}

export interface SourceDistributionItem {
  source_type: string;
  count: number;
}

export async function getSourceDistribution(
  db: Database,
): Promise<SourceDistributionItem[]> {
  const rows = await db.select<{ source_type: string; cnt: number }[]>(
    `SELECT src.type AS source_type, COUNT(*) AS cnt
     FROM sessions s
     JOIN sources src ON s.source_id = src.id
     GROUP BY src.type
     ORDER BY cnt DESC`,
  );
  return rows.map((r) => ({ source_type: r.source_type, count: r.cnt }));
}

export interface SessionIntelligenceItem {
  entity_type: "project" | "theme";
  entity_id: string;
  label: string;
}

export async function getSessionIntelligence(
  db: Database,
  sessionId: string,
): Promise<SessionIntelligenceItem[]> {
  const projectRows = await db.select<{ entity_id: string; canonical_title: string }[]>(
    `SELECT DISTINCT el.entity_id, p.canonical_title
     FROM evidence_links el
     JOIN projects p ON p.id = el.entity_id
     WHERE el.session_id = $1 AND el.entity_type = 'project' AND p.status != 'archived'`,
    [sessionId],
  );

  const themeRows = await db.select<{ entity_id: string; label: string }[]>(
    `SELECT DISTINCT el.entity_id, t.label
     FROM evidence_links el
     JOIN themes t ON t.id = el.entity_id
     WHERE el.session_id = $1 AND el.entity_type = 'theme'`,
    [sessionId],
  );

  return [
    ...projectRows.map((r) => ({
      entity_type: "project" as const,
      entity_id: r.entity_id,
      label: r.canonical_title,
    })),
    ...themeRows.map((r) => ({
      entity_type: "theme" as const,
      entity_id: r.entity_id,
      label: r.label,
    })),
  ];
}

export interface UpsertSessionAnalyticsInput {
  session_id: string;
  message_count: number;
  user_msg_count: number;
  assistant_msg_count: number;
  word_count: number;
  duration_minutes: number | null;
  top_keywords_json: string;
}

export async function upsertSessionAnalytics(
  db: Database,
  input: UpsertSessionAnalyticsInput,
): Promise<void> {
  await db.execute(
    `INSERT INTO session_analytics
     (session_id, message_count, user_msg_count, assistant_msg_count, word_count, duration_minutes, top_keywords_json, computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, datetime('now'))
     ON CONFLICT(session_id) DO UPDATE SET
       message_count = excluded.message_count,
       user_msg_count = excluded.user_msg_count,
       assistant_msg_count = excluded.assistant_msg_count,
       word_count = excluded.word_count,
       duration_minutes = excluded.duration_minutes,
       top_keywords_json = excluded.top_keywords_json,
       computed_at = excluded.computed_at`,
    [
      input.session_id,
      input.message_count,
      input.user_msg_count,
      input.assistant_msg_count,
      input.word_count,
      input.duration_minutes,
      input.top_keywords_json,
    ],
  );
}

export async function listSessionIdsWithAnalytics(
  db: Database,
): Promise<Set<string>> {
  const rows = await db.select<{ session_id: string }[]>(
    "SELECT session_id FROM session_analytics",
  );
  return new Set(rows.map((r) => r.session_id));
}

function parseKeywordsJson(raw: unknown): string[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}
