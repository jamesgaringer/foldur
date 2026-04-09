import type {
  Source,
  NewSource,
  ImportBatch,
  NewImportBatch,
  ImportStatus,
  NewSession,
  Session,
  NewMessage,
  Message,
  NewArtifact,
  Artifact,
  NewChunk,
  NewPipelineRun,
  PipelineRun,
  PipelineRunStatus,
  NewParseWarning,
  NewProject,
  Project,
  NewEvidenceLink,
  EvidenceLink,
} from "@foldur/core";

export interface DatabasePort {
  upsertSource(source: NewSource): Promise<Source>;
  createImportBatch(batch: NewImportBatch): Promise<ImportBatch>;
  updateImportBatchStatus(
    id: string,
    status: ImportStatus,
    counts?: {
      session_count?: number;
      warning_count?: number;
      search_index_version?: number;
    },
  ): Promise<void>;
  importBatchExistsForHash(fileHash: string): Promise<boolean>;

  createSession(session: NewSession): Promise<Session>;
  createMessages(messages: NewMessage[]): Promise<Message[]>;
  createArtifacts(artifacts: NewArtifact[]): Promise<Artifact[]>;
  createChunks(chunks: NewChunk[], sourceId: string): Promise<void>;

  createProject(project: NewProject): Promise<Project>;
  createEvidenceLink(link: NewEvidenceLink): Promise<EvidenceLink>;

  createPipelineRun(run: NewPipelineRun): Promise<PipelineRun>;
  completePipelineRun(
    id: string,
    status: PipelineRunStatus,
    errorMessage?: string,
  ): Promise<void>;

  createParseWarnings(warnings: NewParseWarning[]): Promise<void>;
}
