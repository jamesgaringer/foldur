import type Database from "@tauri-apps/plugin-sql";
import type { DatabasePort } from "./ports.js";
import * as dbRepo from "@foldur/db";

export function createTauriDbAdapter(db: Database): DatabasePort {
  return {
    upsertSource: (source) => dbRepo.upsertSource(db, source),
    createImportBatch: (batch) => dbRepo.createImportBatch(db, batch),
    updateImportBatchStatus: (id, status, counts) =>
      dbRepo.updateImportBatchStatus(db, id, status, counts),
    importBatchExistsForHash: (hash) =>
      dbRepo.importBatchExistsForHash(db, hash),
    createSession: (session) => dbRepo.createSession(db, session),
    createMessages: (messages) => dbRepo.createMessages(db, messages),
    createArtifacts: (artifacts) => dbRepo.createArtifacts(db, artifacts),
    createChunks: (chunks, sourceId) => dbRepo.createChunks(db, chunks, sourceId),
    createProject: (project) => dbRepo.createProject(db, project),
    createEvidenceLink: (link) => dbRepo.createEvidenceLink(db, link),
    createPipelineRun: (run) => dbRepo.createPipelineRun(db, run),
    completePipelineRun: (id, status, errorMessage) =>
      dbRepo.completePipelineRun(db, id, status, errorMessage),
    createParseWarnings: (warnings) => dbRepo.createParseWarnings(db, warnings),
  };
}
