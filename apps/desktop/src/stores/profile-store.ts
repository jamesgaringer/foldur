import { create } from "zustand";
import type { Pattern, EvidenceLink } from "@foldur/core";
import {
  getUserProfile,
  listAllPatterns,
  listEvidenceLinksForEntity,
  getSetting,
  type UserProfile,
} from "@foldur/db";
import { checkOllamaHealth, type OllamaHealthResult } from "@foldur/pipeline";
import { useDbStore } from "./db-store.ts";

interface ProfileState {
  profile: UserProfile | null;
  patterns: Pattern[];
  evidenceByPattern: Record<string, EvidenceLink[]>;
  ollamaHealth: OllamaHealthResult | null;
  currentTier: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  checkOllama: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  patterns: [],
  evidenceByPattern: {},
  ollamaHealth: null,
  currentTier: null,
  isLoading: false,
  error: null,

  refresh: async () => {
    const db = useDbStore.getState().db;
    if (!db) return;
    set({ isLoading: true, error: null });
    try {
      const [profile, patterns, tier] = await Promise.all([
        getUserProfile(db),
        listAllPatterns(db),
        getSetting(db, "intelligence_tier"),
      ]);

      const evidenceByPattern: Record<string, EvidenceLink[]> = {};
      for (const p of patterns) {
        evidenceByPattern[p.id] = await listEvidenceLinksForEntity(
          db,
          "pattern",
          p.id,
        );
      }

      set({
        profile,
        patterns,
        evidenceByPattern,
        currentTier: tier,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : String(err),
        isLoading: false,
      });
    }
  },

  checkOllama: async () => {
    const db = useDbStore.getState().db;
    if (!db) return;
    try {
      const url =
        (await getSetting(db, "ollama_url")) ?? "http://localhost:11434";
      const result = await checkOllamaHealth(url);
      set({ ollamaHealth: result });
    } catch {
      set({
        ollamaHealth: { available: false, models: [], error: "Check failed" },
      });
    }
  },
}));
