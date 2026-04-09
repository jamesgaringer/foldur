import type Database from "@tauri-apps/plugin-sql";
import {
  listThemes,
  listEvidenceLinksForEntity,
  getSessionById,
  updateThemeEnrichment,
} from "@foldur/db";

export interface ThemeEnrichmentResult {
  enriched: number;
}

/**
 * Enriches themes with recurrence scores, descriptions, and confidence
 * based on evidence link density. Re-enriches all themes each run.
 */
export async function ensureThemeEnrichmentUpToDate(
  db: Database,
): Promise<ThemeEnrichmentResult> {
  const themes = await listThemes(db);
  const totalSessions = await getTotalSessionCount(db);
  let enriched = 0;

  for (const theme of themes) {
    const evidence = await listEvidenceLinksForEntity(db, "theme", theme.id);
    const sessionIds = [...new Set(evidence.map((e) => e.session_id))];
    const sessionCount = sessionIds.length;

    const recurrence = totalSessions > 0
      ? Math.min(sessionCount / totalSessions, 1)
      : 0;

    let confidence: number;
    if (sessionCount >= 5) confidence = 0.75;
    else if (sessionCount >= 3) confidence = 0.6;
    else confidence = 0.35;

    const now = Date.now();
    const recentCount = evidence.filter((e) => {
      return now - new Date(e.created_at).getTime() < 14 * 86400000;
    }).length;
    const priorCount = evidence.filter((e) => {
      const age = now - new Date(e.created_at).getTime();
      return age >= 14 * 86400000 && age < 28 * 86400000;
    }).length;

    let trendWord: string;
    if (recentCount > priorCount + 1) trendWord = "Rising";
    else if (priorCount > recentCount + 1) trendWord = "Declining";
    else trendWord = "Stable";

    const sessionTitles: string[] = [];
    for (const sid of sessionIds.slice(0, 3)) {
      const s = await getSessionById(db, sid);
      if (s?.title) sessionTitles.push(s.title.trim());
    }

    let description: string;
    if (sessionCount >= 2) {
      const titleSnippet = sessionTitles.length > 0
        ? `: ${sessionTitles.join(", ")}`
        : "";
      description = `${trendWord} — appears in ${sessionCount} session${sessionCount > 1 ? "s" : ""}${titleSnippet}`;
    } else {
      description = `${trendWord} — appears in 1 session`;
    }

    await updateThemeEnrichment(db, theme.id, {
      description,
      confidence,
      recurrence_score: recurrence,
    });

    enriched++;
  }

  return { enriched };
}

async function getTotalSessionCount(db: Database): Promise<number> {
  const rows = await db.select<{ cnt: number }[]>(
    "SELECT COUNT(*) as cnt FROM sessions",
  );
  return rows[0]?.cnt ?? 0;
}
