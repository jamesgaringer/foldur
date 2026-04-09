import type {
  SourceAdapter,
  ParseWarningItem,
  NewMessage,
  NewArtifact,
  EmbeddingProvider,
  ExtractionProvider,
} from "@foldur/core";
import { nowISO, SEARCH_INDEX_VERSION } from "@foldur/core";
import { detectAdapter } from "@foldur/adapters";
import type { DatabasePort } from "./ports.js";
import { chunksFromArtifacts, chunksFromMessages } from "./chunking.js";
import { applyEmbeddingsToChunks } from "./embed-chunks.js";
import { persistSessionExtraction } from "./persist-extraction.js";

export interface ImportFileInput {
  data: ArrayBuffer;
  fileName: string;
}

export interface ImportResult {
  batchId: string;
  sourceType: string;
  sessionCount: number;
  warningCount: number;
  warnings: ParseWarningItem[];
  status: "completed" | "failed";
  error?: string;
}

export interface ImportProgress {
  stage:
    | "detecting"
    | "validating"
    | "parsing"
    | "normalizing"
    | "persisting"
    | "indexing"
    | "embedding"
    | "extracting"
    | "completed"
    | "failed";
  fileName: string;
  detail?: string;
}

export type ProgressCallback = (progress: ImportProgress) => void;

export interface ImportFileOptions {
  adapter?: SourceAdapter;
  embeddingProvider?: EmbeddingProvider;
  extractionProvider?: ExtractionProvider;
}

export async function importFile(
  input: ImportFileInput,
  db: DatabasePort,
  onProgress?: ProgressCallback,
  options?: ImportFileOptions,
): Promise<ImportResult> {
  const { data, fileName } = input;

  onProgress?.({ stage: "detecting", fileName });

  const adapter = options?.adapter ?? (await detectAdapter(data, fileName));
  if (!adapter) {
    return {
      batchId: "",
      sourceType: "unknown",
      sessionCount: 0,
      warningCount: 0,
      warnings: [],
      status: "failed",
      error: `No adapter could parse file: ${fileName}`,
    };
  }

  const pipelineRun = await db.createPipelineRun({
    import_batch_id: null,
    stage: "import",
    status: "running",
    started_at: nowISO(),
    completed_at: null,
    error_message: null,
    metadata_json: JSON.stringify({ fileName, adapter: adapter.sourceType }),
  });

  let batch: Awaited<ReturnType<typeof db.createImportBatch>> | null = null;

  try {
    onProgress?.({ stage: "validating", fileName });

    const source = await db.upsertSource({
      type: adapter.sourceType,
      name: adapter.sourceType,
      version: null,
      adapter_key: `${adapter.sourceType}-${adapter.adapterVersion}`,
    });

    onProgress?.({ stage: "parsing", fileName });

    const rawResult = await adapter.parseRaw(data, fileName);

    const existingBatch = await db.importBatchExistsForHash(rawResult.fileHash);
    if (existingBatch) {
      await db.completePipelineRun(pipelineRun.id, "completed");
      return {
        batchId: "",
        sourceType: adapter.sourceType,
        sessionCount: 0,
        warningCount: 0,
        warnings: [
          {
            code: "DUPLICATE_IMPORT",
            message: `File "${fileName}" has already been imported (matching content hash).`,
          },
        ],
        status: "completed",
      };
    }

    batch = await db.createImportBatch({
      source_id: source.id,
      imported_at: nowISO(),
      file_name: fileName,
      file_hash: rawResult.fileHash,
      parser_version: adapter.adapterVersion,
      status: "parsing",
      raw_storage_path: null,
      metadata_json: null,
      session_count: 0,
      warning_count: 0,
      search_index_version: 0,
    });

    onProgress?.({ stage: "normalizing", fileName });

    const normalized = adapter.normalize(rawResult, source.id, batch.id);

    onProgress?.({ stage: "persisting", fileName });

    let sessionCount = 0;
    for (const normSession of normalized.sessions) {
      const session = await db.createSession(normSession.session);

      const messagesWithSessionId: NewMessage[] = normSession.messages.map((m) => ({
        ...m,
        session_id: session.id,
      }));
      const persistedMessages = await db.createMessages(messagesWithSessionId);

      const artifactsWithSessionId: NewArtifact[] = normSession.artifacts.map((a) => ({
        ...a,
        session_id: session.id,
      }));
      const persistedArtifacts = await db.createArtifacts(artifactsWithSessionId);

      onProgress?.({ stage: "indexing", fileName });

      const chunks = [
        ...chunksFromMessages(session.id, persistedMessages),
        ...chunksFromArtifacts(session.id, persistedArtifacts),
      ];
      if (options?.embeddingProvider) {
        onProgress?.({ stage: "embedding", fileName });
        await applyEmbeddingsToChunks(chunks, options.embeddingProvider);
      }
      await db.createChunks(chunks, source.id);

      if (options?.extractionProvider) {
        onProgress?.({ stage: "extracting", fileName });
        const candidates = await options.extractionProvider.extractSession({
          session,
          messages: persistedMessages,
          artifacts: persistedArtifacts,
        });
        if (candidates.length > 0) {
          await persistSessionExtraction(db, candidates);
        }
      }

      sessionCount++;
    }

    const allWarnings = normalized.warnings;
    if (allWarnings.length > 0 && batch) {
      await db.createParseWarnings(
        allWarnings.map((w: ParseWarningItem) => ({
          import_batch_id: batch!.id,
          code: w.code,
          message: w.message,
          context_json: w.context ? JSON.stringify(w.context) : null,
        })),
      );
    }

    await db.updateImportBatchStatus(batch.id, "completed", {
      session_count: sessionCount,
      warning_count: allWarnings.length,
      search_index_version: SEARCH_INDEX_VERSION,
    });

    await db.completePipelineRun(pipelineRun.id, "completed");

    onProgress?.({ stage: "completed", fileName });

    return {
      batchId: batch.id,
      sourceType: adapter.sourceType,
      sessionCount,
      warningCount: allWarnings.length,
      warnings: allWarnings,
      status: "completed",
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    try {
      await db.completePipelineRun(pipelineRun.id, "failed", errorMessage);
    } catch {
      // Pipeline-run bookkeeping failure should not mask the original import error
    }

    if (batch) {
      try {
        await db.updateImportBatchStatus(batch.id, "failed");
      } catch {
        // Batch status update failure should not mask the original error
      }
    }

    onProgress?.({ stage: "failed", fileName, detail: errorMessage });

    return {
      batchId: batch?.id ?? "",
      sourceType: adapter.sourceType,
      sessionCount: 0,
      warningCount: 0,
      warnings: [],
      status: "failed",
      error: errorMessage,
    };
  }
}

export async function importFiles(
  inputs: ImportFileInput[],
  db: DatabasePort,
  onProgress?: ProgressCallback,
  options?: ImportFileOptions,
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  for (const input of inputs) {
    const result = await importFile(input, db, onProgress, options);
    results.push(result);
  }
  return results;
}
