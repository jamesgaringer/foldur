import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell.tsx";
import { Home } from "./pages/Home.tsx";
import { ImportCenter } from "./pages/ImportCenter.tsx";
import { SearchPage } from "./pages/SearchPage.tsx";
import { SessionPage } from "./pages/SessionPage.tsx";
import { ProjectDetailPage } from "./pages/ProjectDetailPage.tsx";
import { ProjectsPage } from "./pages/ProjectsPage.tsx";
import { RecommendationsPage } from "./pages/RecommendationsPage.tsx";
import { TimelinePage } from "./pages/TimelinePage.tsx";
import { ThemeDetailPage } from "./pages/ThemeDetailPage.tsx";
import { ThemesPage } from "./pages/ThemesPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";
import { useDbStore } from "./stores/db-store.ts";
import { useLibraryStore } from "./stores/library-store.ts";

export function App() {
  const initialize = useDbStore((s) => s.initialize);
  const isReady = useDbStore((s) => s.isReady);
  const dbError = useDbStore((s) => s.error);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isReady) {
      useLibraryStore.getState().refresh();
    }
  }, [isReady]);

  return (
    <AppShell>
      {dbError && (
        <div className="mx-4 mt-4 rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-300">
          <strong className="font-semibold">Database error:</strong> {dbError}
        </div>
      )}
      <Routes>
        <Route path="/" element={<Navigate to="/import" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/import" element={<ImportCenter />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/sessions/:sessionId" element={<SessionPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/themes" element={<ThemesPage />} />
        <Route path="/themes/:themeId" element={<ThemeDetailPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
            <p className="text-lg font-medium">Page not found</p>
            <a href="/home" className="mt-2 text-sm text-[var(--color-accent)] hover:underline">Go home</a>
          </div>
        } />
      </Routes>
    </AppShell>
  );
}
