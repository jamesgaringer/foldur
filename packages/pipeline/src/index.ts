export type { DatabasePort } from "./ports.js";
export { importFile, importFiles } from "./import-orchestrator.js";
export type {
  ImportFileInput,
  ImportFileOptions,
  ImportResult,
  ImportProgress,
  ProgressCallback,
} from "./import-orchestrator.js";
export { createTauriDbAdapter } from "./tauri-db-adapter.js";
export {
  ensureSearchIndexUpToDate,
  type EnsureSearchIndexOptions,
} from "./search-index-backfill.js";
export {
  ensureChunkEmbeddingsUpToDate,
  type EnsureChunkEmbeddingsOptions,
} from "./embedding-backfill.js";
export {
  ensureSessionExtractionUpToDate,
  type EnsureSessionExtractionOptions,
} from "./extraction-backfill.js";
export { ensureRecommendationStubUpToDate } from "./recommendation-stub-backfill.js";
export { ensureThemesBackfillUpToDate } from "./theme-backfill.js";
export {
  ensureSessionAnalyticsUpToDate,
  type SessionAnalyticsBackfillResult,
} from "./session-analytics-backfill.js";
export {
  ensureProjectEnrichmentUpToDate,
  type ProjectEnrichmentResult,
} from "./project-enrichment.js";
export {
  ensureThemeEnrichmentUpToDate,
  type ThemeEnrichmentResult,
} from "./theme-enrichment.js";
export {
  generateRecommendations,
  type RecommendationGeneratorResult,
} from "./recommendation-generator.js";
export {
  splitTextForChunks,
  chunksFromMessages,
  chunksFromArtifacts,
} from "./chunking.js";
export { applyEmbeddingsToChunks } from "./embed-chunks.js";
export { persistSessionExtraction } from "./persist-extraction.js";
export {
  OllamaProvider,
  OllamaError,
  checkOllamaHealth,
  type OllamaHealthResult,
  type OllamaErrorCode,
} from "./ollama-provider.js";
export {
  runBehavioralProfile,
  type BehavioralProfileResult,
} from "./behavioral-profiler.js";
