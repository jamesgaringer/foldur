import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDbStore } from "../stores/db-store.ts";
import { useAnalyticsStore } from "../stores/analytics-store.ts";
import type { ThemeWithRecurrence } from "@foldur/db";

type SortKey = "recurrence" | "recent" | "name";

const TREND_ARROWS: Record<string, string> = {
  rising: "text-green-400",
  stable: "text-gray-400",
  declining: "text-amber-400",
};

const TREND_LABELS: Record<string, string> = {
  rising: "Rising",
  stable: "Stable",
  declining: "Declining",
};

export function ThemesPage() {
  const { isReady, tauriContext } = useDbStore();
  const { allThemes, refreshThemes } = useAnalyticsStore();
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("recurrence");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await refreshThemes();
    } finally {
      setLoading(false);
    }
  }, [refreshThemes]);

  useEffect(() => {
    if (isReady) void load();
  }, [isReady, load]);

  const sorted = useMemo(() => {
    const list = [...allThemes];
    switch (sortKey) {
      case "recent":
        list.sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());
        break;
      case "name":
        list.sort((a, b) => a.label.localeCompare(b.label));
        break;
      default:
        list.sort((a, b) => b.session_count - a.session_count);
    }
    return list;
  }, [allThemes, sortKey]);

  if (!tauriContext) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Themes</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Run the Foldur desktop app to view themes from your local database.
        </p>
      </div>
    );
  }

  if (!isReady || loading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading themes...</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Themes</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Recurring topics detected across your sessions, enriched with recurrence scoring and trend analysis.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          Sort
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
          >
            <option value="recurrence">Recurrence</option>
            <option value="recent">Recent</option>
            <option value="name">Name</option>
          </select>
        </label>
        <span className="ml-auto text-xs text-[var(--color-text-muted)]">
          {sorted.length} theme{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No themes yet. Import sessions and restart so the backfill can run.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-lg border border-[var(--color-border)]">
          {sorted.map((t: ThemeWithRecurrence) => (
            <li key={t.id}>
              <Link
                to={`/themes/${t.id}`}
                className="block bg-[var(--color-surface)] px-4 py-4 transition-colors hover:bg-[var(--color-surface-raised)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--color-text-primary)]">{t.label}</p>
                    {t.description && (
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t.description}</p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
                      {t.session_count} session{t.session_count !== 1 ? "s" : ""}
                    </span>
                    <span className={`text-xs font-semibold ${TREND_ARROWS[t.trend] ?? TREND_ARROWS.stable}`}>
                      {TREND_LABELS[t.trend] ?? "Stable"}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                  <span>{Math.round(t.confidence * 100)}% confidence</span>
                  {t.recurrence_score != null && t.recurrence_score > 0 && (
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-block h-1.5 rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${Math.round(t.recurrence_score * 60)}px` }}
                      />
                      recurrence
                    </span>
                  )}
                  <span className="ml-auto">
                    last seen {t.last_seen_at ? new Date(t.last_seen_at).toLocaleDateString() : "--"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
