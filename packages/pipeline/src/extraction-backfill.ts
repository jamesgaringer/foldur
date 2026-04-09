import type Database from "@tauri-apps/plugin-sql";
import type { ExtractionProvider } from "@foldur/core";
import {
  getArtifactsBySession,
  getMessagesBySession,
  hasSessionProjectEvidence,
  listAllSessions,
} from "@foldur/db";
import { createTauriDbAdapter } from "./tauri-db-adapter.js";
import { persistSessionExtraction } from "./persist-extraction.js";

export interface EnsureSessionExtractionOptions {
  /** Max sessions to process in one run (safety valve). Default unlimited. */
  maxSessions?: number;
}

/**
 * Runs extraction for sessions that do not yet have project evidence — e.g. imports
 * completed before extraction shipped. Idempotent per session.
 */
export async function ensureSessionExtractionUpToDate(
  db: Database,
  provider: ExtractionProvider,
  options?: EnsureSessionExtractionOptions,
): Promise<{ sessionsBackfilled: number; projectsCreated: number }> {
  const maxSessions = options?.maxSessions;
  const adapter = createTauriDbAdapter(db);
  const sessions = await listAllSessions(db);

  let sessionsBackfilled = 0;
  let projectsCreated = 0;
  let processed = 0;

  for (const session of sessions) {
    if (maxSessions !== undefined && processed >= maxSessions) break;

    if (await hasSessionProjectEvidence(db, session.id)) {
      continue;
    }

    const messages = await getMessagesBySession(db, session.id);
    const artifacts = await getArtifactsBySession(db, session.id);

    const candidates = await provider.extractSession({
      session,
      messages,
      artifacts,
    });

    if (candidates.length === 0) continue;

    await persistSessionExtraction(adapter, candidates);
    sessionsBackfilled++;
    projectsCreated += candidates.length;
    processed++;
  }

  return { sessionsBackfilled, projectsCreated };
}
