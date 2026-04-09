import { create } from "zustand";
import type { ImportBatch, ParseWarning } from "@foldur/core";
import type { ImportProgress, ImportResult } from "@foldur/pipeline";
import { importFile, createTauriDbAdapter } from "@foldur/pipeline";
import { defaultEmbeddingProvider } from "../embedding-default.ts";
import { defaultExtractionProvider } from "../extraction-default.ts";
import { getImportBatches, getParseWarningsByBatch } from "@foldur/db";
import { useDbStore } from "./db-store.ts";
import { useLibraryStore } from "./library-store.ts";

interface ImportState {
  isImporting: boolean;
  currentProgress: ImportProgress | null;
  lastResult: ImportResult | null;
  importHistory: ImportBatch[];
  selectedBatchWarnings: ParseWarning[];
  selectedBatchId: string | null;

  runImport: (files: { data: ArrayBuffer; fileName: string }[]) => Promise<void>;
  loadHistory: () => Promise<void>;
  selectBatch: (batchId: string | null) => Promise<void>;
}

export const useImportStore = create<ImportState>((set, get) => ({
  isImporting: false,
  currentProgress: null,
  lastResult: null,
  importHistory: [],
  selectedBatchWarnings: [],
  selectedBatchId: null,

  runImport: async (files) => {
    const db = useDbStore.getState().db;
    if (!db) return;

    set({ isImporting: true, currentProgress: null, lastResult: null });
    const dbAdapter = createTauriDbAdapter(db);

    try {
      for (const file of files) {
        const result = await importFile(file, dbAdapter, (progress) => {
          set({ currentProgress: progress });
        }, {
          embeddingProvider: defaultEmbeddingProvider,
          extractionProvider: defaultExtractionProvider,
        });
        set({ lastResult: result });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({
        lastResult: {
          batchId: "",
          sourceType: "unknown",
          sessionCount: 0,
          warningCount: 0,
          warnings: [{ code: "IMPORT_ERROR", message }],
          status: "failed",
          error: message,
        },
      });
    } finally {
      set({ isImporting: false, currentProgress: null });
      await get().loadHistory();
      await useLibraryStore.getState().refresh();
    }
  },

  loadHistory: async () => {
    const db = useDbStore.getState().db;
    if (!db) return;
    const batches = await getImportBatches(db);
    set({ importHistory: batches });
  },

  selectBatch: async (batchId) => {
    set({ selectedBatchId: batchId, selectedBatchWarnings: [] });
    if (!batchId) return;

    const db = useDbStore.getState().db;
    if (!db) return;

    const warnings = await getParseWarningsByBatch(db, batchId);
    set({ selectedBatchWarnings: warnings });
  },
}));
