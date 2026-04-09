import type Database from "@tauri-apps/plugin-sql";
import type { EmbeddingProvider } from "@foldur/core";
import { SEARCH_INDEX_VERSION } from "@foldur/core";
import {
  createChunks,
  deleteChunksForSessions,
  getArtifactsBySession,
  getMessagesBySession,
  getSessionsByBatch,
  listImportBatchesNeedingSearchIndex,
  updateImportBatchStatus,
} from "@foldur/db";
import { chunksFromArtifacts, chunksFromMessages } from "./chunking.js";
import { applyEmbeddingsToChunks } from "./embed-chunks.js";

export interface EnsureSearchIndexOptions {
  embeddingProvider?: EmbeddingProvider;
}

/**
 * Ensures all completed imports have chunk + FTS rows for the current
 * `SEARCH_INDEX_VERSION`. Safe to call on every app start; no-ops when nothing is stale.
 */
export async function ensureSearchIndexUpToDate(
  db: Database,
  options?: EnsureSearchIndexOptions,
): Promise<{
  batchesProcessed: number;
  sessionsIndexed: number;
}> {
  const pending = await listImportBatchesNeedingSearchIndex(
    db,
    SEARCH_INDEX_VERSION,
  );
  let batchesProcessed = 0;
  let sessionsIndexed = 0;

  for (const batch of pending) {
    const sessions = await getSessionsByBatch(db, batch.id);
    if (sessions.length === 0) {
      await updateImportBatchStatus(db, batch.id, "completed", {
        search_index_version: SEARCH_INDEX_VERSION,
      });
      batchesProcessed++;
      continue;
    }

    for (const session of sessions) {
      await deleteChunksForSessions(db, [session.id]);

      const messages = await getMessagesBySession(db, session.id);
      const artifacts = await getArtifactsBySession(db, session.id);
      const chunks = [
        ...chunksFromMessages(session.id, messages),
        ...chunksFromArtifacts(session.id, artifacts),
      ];
      if (options?.embeddingProvider) {
        await applyEmbeddingsToChunks(chunks, options.embeddingProvider);
      }
      await createChunks(db, chunks, session.source_id);
      sessionsIndexed++;
    }

    await updateImportBatchStatus(db, batch.id, "completed", {
      search_index_version: SEARCH_INDEX_VERSION,
    });
    batchesProcessed++;
  }

  return { batchesProcessed, sessionsIndexed };
}
