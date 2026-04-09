import type { DatabasePort } from "../src/ports.js";
import type {
  Source,
  NewSource,
  ImportBatch,
  NewImportBatch,
  ImportStatus,
  Session,
  NewSession,
  Message,
  NewMessage,
  Artifact,
  NewArtifact,
  NewChunk,
  PipelineRun,
  NewPipelineRun,
  PipelineRunStatus,
  NewParseWarning,
  NewProject,
  Project,
  NewEvidenceLink,
  EvidenceLink,
} from "@foldur/core";
import { generateId, nowISO } from "@foldur/core";

export interface MockDbState {
  sources: Source[];
  importBatches: ImportBatch[];
  sessions: Session[];
  messages: Message[];
  artifacts: Artifact[];
  chunks: NewChunk[];
  projects: Project[];
  evidenceLinks: EvidenceLink[];
  pipelineRuns: PipelineRun[];
  parseWarnings: NewParseWarning[];
}

export function createMockDb(): DatabasePort & { state: MockDbState } {
  const state: MockDbState = {
    sources: [],
    importBatches: [],
    sessions: [],
    messages: [],
    artifacts: [],
    chunks: [],
    projects: [],
    evidenceLinks: [],
    pipelineRuns: [],
    parseWarnings: [],
  };

  return {
    state,

    async upsertSource(source: NewSource): Promise<Source> {
      const existing = state.sources.find(
        (s) => s.type === source.type && s.adapter_key === source.adapter_key,
      );
      if (existing) return existing;

      const now = nowISO();
      const newSource: Source = { id: generateId(), ...source, created_at: now, updated_at: now };
      state.sources.push(newSource);
      return newSource;
    },

    async createImportBatch(batch: NewImportBatch): Promise<ImportBatch> {
      const now = nowISO();
      const newBatch: ImportBatch = {
        id: generateId(),
        ...batch,
        search_index_version: batch.search_index_version ?? 0,
        created_at: now,
        updated_at: now,
      };
      state.importBatches.push(newBatch);
      return newBatch;
    },

    async updateImportBatchStatus(
      id: string,
      status: ImportStatus,
      counts?: {
        session_count?: number;
        warning_count?: number;
        search_index_version?: number;
      },
    ): Promise<void> {
      const batch = state.importBatches.find((b) => b.id === id);
      if (batch) {
        batch.status = status;
        if (counts?.session_count !== undefined)
          batch.session_count = counts.session_count;
        if (counts?.warning_count !== undefined)
          batch.warning_count = counts.warning_count;
        if (counts?.search_index_version !== undefined)
          batch.search_index_version = counts.search_index_version;
      }
    },

    async importBatchExistsForHash(fileHash: string): Promise<boolean> {
      return state.importBatches.some(
        (b) => b.file_hash === fileHash && b.status === "completed",
      );
    },

    async createSession(session: NewSession): Promise<Session> {
      const now = nowISO();
      const newSession: Session = {
        id: generateId(),
        ...session,
        created_at: now,
        updated_at: now,
      };
      state.sessions.push(newSession);
      return newSession;
    },

    async createMessages(messages: NewMessage[]): Promise<Message[]> {
      const created: Message[] = [];
      const now = nowISO();
      for (const message of messages) {
        const msg: Message = {
          id: generateId(),
          ...message,
          created_at: now,
          updated_at: now,
        };
        state.messages.push(msg);
        created.push(msg);
      }
      return created;
    },

    async createArtifacts(artifacts: NewArtifact[]): Promise<Artifact[]> {
      const created: Artifact[] = [];
      const now = nowISO();
      for (const artifact of artifacts) {
        const art: Artifact = {
          id: generateId(),
          ...artifact,
          created_at: now,
        };
        state.artifacts.push(art);
        created.push(art);
      }
      return created;
    },

    async createChunks(chunks: NewChunk[], _sourceId: string): Promise<void> {
      state.chunks.push(...chunks);
    },

    async createProject(input: NewProject): Promise<Project> {
      const now = nowISO();
      const p: Project = {
        id: generateId(),
        ...input,
        created_at: now,
        updated_at: now,
      };
      state.projects.push(p);
      return p;
    },

    async createEvidenceLink(input: NewEvidenceLink): Promise<EvidenceLink> {
      const now = nowISO();
      const e: EvidenceLink = {
        id: generateId(),
        ...input,
        created_at: now,
      };
      state.evidenceLinks.push(e);
      return e;
    },

    async createPipelineRun(run: NewPipelineRun): Promise<PipelineRun> {
      const now = nowISO();
      const newRun: PipelineRun = { id: generateId(), ...run, created_at: now };
      state.pipelineRuns.push(newRun);
      return newRun;
    },

    async completePipelineRun(
      id: string,
      status: PipelineRunStatus,
      errorMessage?: string,
    ): Promise<void> {
      const run = state.pipelineRuns.find((r) => r.id === id);
      if (run) {
        run.status = status;
        run.completed_at = nowISO();
        if (errorMessage) run.error_message = errorMessage;
      }
    },

    async createParseWarnings(warnings: NewParseWarning[]): Promise<void> {
      state.parseWarnings.push(...warnings);
    },
  };
}
