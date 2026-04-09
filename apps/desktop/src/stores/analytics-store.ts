import { create } from "zustand";
import type {
  ActivityTrendPoint,
  ProjectWithActivity,
  SourceDistributionItem,
  ThemeWithRecurrence,
} from "@foldur/db";
import {
  getActivityTrend,
  getProjectsWithActivity,
  getSourceDistribution,
  getThemesWithRecurrence,
  getTopActiveProjects,
  getTopRecurringThemes,
  listOpenRecommendations,
} from "@foldur/db";
import type { Recommendation } from "@foldur/core";
import { useDbStore } from "./db-store.ts";

interface AnalyticsState {
  activityTrend: ActivityTrendPoint[];
  topProjects: ProjectWithActivity[];
  allProjects: ProjectWithActivity[];
  topThemes: ThemeWithRecurrence[];
  allThemes: ThemeWithRecurrence[];
  sourceDistribution: SourceDistributionItem[];
  openRecommendations: Recommendation[];
  isLoading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  refreshThemes: () => Promise<void>;
  refreshRecommendations: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  activityTrend: [],
  topProjects: [],
  allProjects: [],
  topThemes: [],
  allThemes: [],
  sourceDistribution: [],
  openRecommendations: [],
  isLoading: false,
  error: null,

  refreshDashboard: async () => {
    const db = useDbStore.getState().db;
    if (!db) return;
    set({ isLoading: true, error: null });
    try {
      const [activityTrend, topProjects, topThemes, sourceDistribution, openRecommendations] =
        await Promise.all([
          getActivityTrend(db, 30),
          getTopActiveProjects(db, 5),
          getTopRecurringThemes(db, 5),
          getSourceDistribution(db),
          listOpenRecommendations(db),
        ]);
      set({ activityTrend, topProjects, topThemes, sourceDistribution, openRecommendations, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), isLoading: false });
    }
  },

  refreshProjects: async () => {
    const db = useDbStore.getState().db;
    if (!db) return;
    try {
      const allProjects = await getProjectsWithActivity(db);
      set({ allProjects });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  refreshThemes: async () => {
    const db = useDbStore.getState().db;
    if (!db) return;
    try {
      const allThemes = await getThemesWithRecurrence(db);
      set({ allThemes });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },

  refreshRecommendations: async () => {
    const db = useDbStore.getState().db;
    if (!db) return;
    try {
      const openRecommendations = await listOpenRecommendations(db);
      set({ openRecommendations });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
    }
  },
}));
