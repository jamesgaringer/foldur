import { create } from "zustand";
import type { LibraryStats, SessionSummary } from "@foldur/db";
import { getLibraryStats, getRecentSessions } from "@foldur/db";
import { useDbStore } from "./db-store.ts";

interface LibraryState {
  stats: LibraryStats | null;
  recentSessions: SessionSummary[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  stats: null,
  recentSessions: [],
  isLoading: false,
  error: null,

  refresh: async () => {
    const db = useDbStore.getState().db;
    if (!db) return;

    set({ isLoading: true, error: null });
    try {
      const [stats, recentSessions] = await Promise.all([
        getLibraryStats(db),
        getRecentSessions(db, 20),
      ]);
      set({ stats, recentSessions, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, isLoading: false });
    }
  },
}));
