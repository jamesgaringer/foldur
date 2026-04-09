import type Database from "@tauri-apps/plugin-sql";
import { nowISO } from "@foldur/core";
import {
  createEvidenceLink,
  createTheme,
  getMessagesBySession,
  getThemeByLabel,
  hasSessionEvidenceOfType,
  listAllSessions,
} from "@foldur/db";

/**
 * For each session without theme evidence, attach a theme label (session title or first user line).
 * Reuses an existing theme row when the label matches (multiple evidence rows per theme).
 */
export async function ensureThemesBackfillUpToDate(
  db: Database,
): Promise<{ themesCreated: number; evidenceCreated: number }> {
  const sessions = await listAllSessions(db);
  let themesCreated = 0;
  let evidenceCreated = 0;

  for (const session of sessions) {
    if (await hasSessionEvidenceOfType(db, session.id, "theme")) {
      continue;
    }

    const messages = await getMessagesBySession(db, session.id);
    const sorted = [...messages].sort((a, b) => a.sort_order - b.sort_order);
    const firstUser = sorted.find((m) => m.role === "user");

    const label =
      session.title?.trim().slice(0, 120) ||
      firstUser?.content_text.trim().slice(0, 120) ||
      "";
    if (!label) continue;

    let theme = await getThemeByLabel(db, label);
    if (!theme) {
      const firstSeen =
        sorted[0]?.timestamp ?? session.started_at ?? nowISO();
      const lastSeen =
        sorted[sorted.length - 1]?.timestamp ??
        session.updated_at ??
        session.started_at ??
        firstSeen;

      theme = await createTheme(db, {
        label,
        description: null,
        confidence: 0.35,
        recurrence_score: null,
        first_seen_at: firstSeen,
        last_seen_at: lastSeen,
      });
      themesCreated++;
    }

    await createEvidenceLink(db, {
      entity_type: "theme",
      entity_id: theme.id,
      session_id: session.id,
      message_id: firstUser?.id ?? null,
      artifact_id: null,
      chunk_id: null,
      excerpt: firstUser?.content_text.slice(0, 500) ?? null,
      explanation:
        "Stub theme: label from session title or first user line (local, deterministic).",
      evidence_score: 0.35,
    });
    evidenceCreated++;
  }

  return { themesCreated, evidenceCreated };
}
