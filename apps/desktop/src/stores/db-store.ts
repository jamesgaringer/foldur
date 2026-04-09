import { create } from "zustand";
import { isTauri } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import {
  configureSqliteConnection,
  runMigrations,
  getSetting,
} from "@foldur/db";
import {
  ensureChunkEmbeddingsUpToDate,
  ensureProjectEnrichmentUpToDate,
  ensureRecommendationStubUpToDate,
  ensureSearchIndexUpToDate,
  ensureSessionExtractionUpToDate,
  ensureSessionAnalyticsUpToDate,
  ensureThemeEnrichmentUpToDate,
  ensureThemesBackfillUpToDate,
  generateRecommendations,
  OllamaProvider,
  runBehavioralProfile,
} from "@foldur/pipeline";
import { defaultEmbeddingProvider } from "../embedding-default.ts";
import { defaultExtractionProvider } from "../extraction-default.ts";

import MIGRATION_001 from "../migrations/001_initial.sql?raw";
import MIGRATION_002 from "../migrations/002_fts.sql?raw";
import MIGRATION_003 from "../migrations/003_search_index_version.sql?raw";
import MIGRATION_004 from "../migrations/004_project_merge.sql?raw";
import MIGRATION_005 from "../migrations/005_merge_candidate_indexes.sql?raw";
import MIGRATION_006 from "../migrations/006_session_analytics.sql?raw";
import MIGRATION_007 from "../migrations/007_behavioral_profile.sql?raw";

function detectTauriContext(): boolean {
  if (typeof window === "undefined") return false;
  return isTauri();
}

export type ProfilingStatus = "idle" | "running" | "done" | "error";

interface DbState {
  db: Database | null;
  isReady: boolean;
  tauriContext: boolean;
  error: string | null;
  profilingStatus: ProfilingStatus;
  profilingError: string | null;
  initialize: () => Promise<void>;
  triggerProfiling: () => Promise<void>;
}

let initPromise: Promise<void> | null = null;

export const useDbStore = create<DbState>((set, get) => ({
  db: null,
  isReady: false,
  tauriContext: detectTauriContext(),
  error: null,
  profilingStatus: "idle",
  profilingError: null,

  initialize: async () => {
    if (get().isReady) return;

    if (!isTauri()) {
      set({
        tauriContext: false,
        isReady: false,
        error: null,
        db: null,
      });
      return;
    }

    set({ tauriContext: true });

    if (initPromise) {
      await initPromise;
      return;
    }

    initPromise = (async () => {
      try {
        const db = await Database.load("sqlite:foldur.db");
        await configureSqliteConnection(db);
        await runMigrations(db, {
          "001_initial": MIGRATION_001,
          "002_fts": MIGRATION_002,
          "003_search_index_version": MIGRATION_003,
          "004_project_merge": MIGRATION_004,
          "005_merge_candidate_indexes": MIGRATION_005,
          "006_session_analytics": MIGRATION_006,
          "007_behavioral_profile": MIGRATION_007,
        });

        await ensureSearchIndexUpToDate(db, {
          embeddingProvider: defaultEmbeddingProvider,
        });

        await ensureChunkEmbeddingsUpToDate(db, defaultEmbeddingProvider);

        const extraction = await ensureSessionExtractionUpToDate(
          db,
          defaultExtractionProvider,
        );
        if (extraction.projectsCreated > 0) {
          console.info(
            `[Foldur] Session extraction backfill: ${extraction.projectsCreated} project(s) across ${extraction.sessionsBackfilled} session(s).`,
          );
        }

        const themesBf = await ensureThemesBackfillUpToDate(db);
        if (themesBf.evidenceCreated > 0) {
          console.info(
            `[Foldur] Themes backfill: ${themesBf.themesCreated} new theme(s), ${themesBf.evidenceCreated} evidence link(s).`,
          );
        }

        const analyticsBf = await ensureSessionAnalyticsUpToDate(db);
        if (analyticsBf.computed > 0) {
          console.info(
            `[Foldur] Session analytics backfill: ${analyticsBf.computed} session(s) computed.`,
          );
        }

        const projectEnrich = await ensureProjectEnrichmentUpToDate(db);
        if (projectEnrich.enriched > 0) {
          console.info(
            `[Foldur] Project enrichment: ${projectEnrich.enriched} project(s) enriched.`,
          );
        }

        const themeEnrich = await ensureThemeEnrichmentUpToDate(db);
        if (themeEnrich.enriched > 0) {
          console.info(
            `[Foldur] Theme enrichment: ${themeEnrich.enriched} theme(s) enriched.`,
          );
        }

        const recStub = await ensureRecommendationStubUpToDate(db);
        if (recStub.created) {
          console.info("[Foldur] Seeded onboarding recommendation (stub).");
        }

        const recGen = await generateRecommendations(db);
        if (recGen.created > 0) {
          console.info(
            `[Foldur] Recommendation generator: ${recGen.created} new recommendation(s).`,
          );
        }

        set({ db, isReady: true, error: null });

        // Non-blocking: kick off behavioral profiling if tier is local-model
        void runBackgroundProfiling(db, set);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        set({ error: message, isReady: false });
        console.error("Failed to initialize database:", message);
      } finally {
        initPromise = null;
      }
    })();

    await initPromise;
  },

  triggerProfiling: async () => {
    const { db } = get();
    if (!db) return;
    await runBackgroundProfiling(db, set);
  },
}));

async function runBackgroundProfiling(
  db: Database,
  set: (state: Partial<DbState>) => void,
): Promise<void> {
  try {
    const tier = await getSetting(db, "intelligence_tier");
    if (tier !== "local-model") return;

    const ollamaUrl =
      (await getSetting(db, "ollama_url")) ?? "http://localhost:11434";
    const ollamaModel =
      (await getSetting(db, "ollama_model")) ?? "llama3.2";

    set({ profilingStatus: "running", profilingError: null });
    console.info("[Foldur] Starting behavioral profiling with Ollama...");

    const provider = new OllamaProvider(ollamaUrl, ollamaModel);
    const result = await runBehavioralProfile(db, provider);

    if (result.error) {
      set({ profilingStatus: "error", profilingError: result.error });
      console.warn("[Foldur] Behavioral profiling error:", result.error);
    } else {
      set({ profilingStatus: "done", profilingError: null });
      console.info(
        `[Foldur] Behavioral profiling complete: ${result.patternsCreated} created, ${result.patternsUpdated} updated.`,
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    set({ profilingStatus: "error", profilingError: msg });
    console.warn("[Foldur] Behavioral profiling failed:", msg);
  }
}
