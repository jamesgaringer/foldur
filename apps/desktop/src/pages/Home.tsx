import { useEffect } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@foldur/ui";
import { LibraryStatsBar } from "../components/LibraryStatsBar.tsx";
import { ActivitySparkline } from "../components/ActivitySparkline.tsx";
import { useDbStore } from "../stores/db-store.ts";
import { useLibraryStore } from "../stores/library-store.ts";
import { useAnalyticsStore } from "../stores/analytics-store.ts";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  stalled: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  speculative: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const ACTIVITY_BADGE: Record<string, string> = {
  hot: "bg-green-500/20 text-green-400",
  warm: "bg-amber-500/20 text-amber-400",
  cold: "bg-gray-500/20 text-gray-400",
};

const TREND_ARROWS: Record<string, string> = {
  rising: "text-green-400",
  stable: "text-gray-400",
  declining: "text-amber-400",
};

const TREND_SYMBOLS: Record<string, string> = {
  rising: "^",
  stable: "-",
  declining: "v",
};

export function Home() {
  const { isReady, tauriContext } = useDbStore();
  const { stats, recentSessions, isLoading, refresh } = useLibraryStore();
  const {
    activityTrend,
    topProjects,
    topThemes,
    sourceDistribution,
    openRecommendations,
    refreshDashboard,
  } = useAnalyticsStore();

  useEffect(() => {
    if (isReady) {
      refresh();
      refreshDashboard();
    }
  }, [isReady, refresh, refreshDashboard]);

  if (!tauriContext) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Run <code className="rounded bg-[var(--color-surface)] px-1">pnpm tauri dev</code>{" "}
          and open the Foldur window. The Vite URL in a normal browser cannot access your local
          database.
        </p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">Connecting to local database...</p>
    );
  }

  const totalTrend = activityTrend.reduce((s, d) => s + d.count, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Home</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Your AI conversation history at a glance — activity, projects, themes, and recommendations.
        </p>
      </div>

      <LibraryStatsBar stats={stats} isLoading={isLoading} />

      {stats && stats.sessionCount === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center">
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            No sessions yet. Import a ChatGPT export or transcript from the{" "}
            <Link to="/import" className="text-[var(--color-accent)] hover:underline">
              Import
            </Link>{" "}
            tab.
          </p>
        </div>
      )}

      {stats && stats.sessionCount > 0 && (
        <>
          {/* Activity trend + source distribution row */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="col-span-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Activity — last 30 days
                </h2>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {totalTrend} session{totalTrend !== 1 ? "s" : ""}
                </span>
              </div>
              <ActivitySparkline data={activityTrend} days={30} height={56} />
            </div>

            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
                Sources
              </h2>
              {sourceDistribution.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">No data</p>
              ) : (
                <div className="space-y-2">
                  {sourceDistribution.map((s) => {
                    const pct = stats.sessionCount > 0
                      ? Math.round((s.count / stats.sessionCount) * 100)
                      : 0;
                    return (
                      <div key={s.source_type} className="flex items-center gap-2">
                        <div
                          className="h-2 rounded-full bg-[var(--color-accent)]"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {s.source_type} ({s.count})
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Working on + themes row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Active projects */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  What you're working on
                </h2>
                <Link to="/projects" className="text-xs text-[var(--color-accent)] hover:underline">
                  View all
                </Link>
              </div>
              {topProjects.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  No active projects yet. Import more sessions.
                </p>
              ) : (
                <ul className="space-y-2">
                  {topProjects.map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/projects/${p.id}`}
                        className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-raised)]"
                      >
                        <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${ACTIVITY_BADGE[p.activity_level] ?? ACTIVITY_BADGE.cold}`}>
                          {p.activity_level}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                            {p.canonical_title}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {p.session_count} session{p.session_count !== 1 ? "s" : ""}
                            {" · "}
                            <span className={`inline-block rounded border px-1 py-0.5 text-[10px] font-medium ${STATUS_COLORS[p.status] ?? STATUS_COLORS.speculative}`}>
                              {p.status}
                            </span>
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Top themes */}
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Top themes
                </h2>
                <Link to="/themes" className="text-xs text-[var(--color-accent)] hover:underline">
                  View all
                </Link>
              </div>
              {topThemes.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  No themes detected yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {topThemes.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={`/themes/${t.id}`}
                        className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-raised)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                            {t.label}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {t.session_count} session{t.session_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className={`text-sm font-bold ${TREND_ARROWS[t.trend] ?? TREND_ARROWS.stable}`} title={t.trend}>
                          {TREND_SYMBOLS[t.trend] ?? "-"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recommendations callout */}
          {openRecommendations.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Recommendations
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-xs font-bold text-[var(--color-accent)]">
                    {openRecommendations.length}
                  </span>
                </h2>
                <Link to="/recommendations" className="text-xs text-[var(--color-accent)] hover:underline">
                  View all
                </Link>
              </div>
              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {openRecommendations[0]!.title}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {openRecommendations[0]!.rationale.slice(0, 150)}
                  {openRecommendations[0]!.rationale.length > 150 ? "..." : ""}
                </p>
              </div>
            </div>
          )}

          {/* Recent sessions (collapsible) */}
          <details className="rounded-lg border border-[var(--color-border)]">
            <summary className="cursor-pointer bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)]">
              Recent sessions ({recentSessions.length})
            </summary>
            <ul className="divide-y divide-[var(--color-border)]">
              {recentSessions.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/sessions/${s.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-[var(--color-surface-raised)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--color-text-primary)]">
                        {s.title?.trim() || "Untitled session"}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {s.started_at
                          ? new Date(s.started_at).toLocaleString()
                          : "No start time"}
                      </p>
                    </div>
                    <StatusBadge label={s.source_type} variant="info" />
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
