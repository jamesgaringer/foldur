import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { StatusBadge } from "@foldur/ui";
import type { SessionWithSourceType } from "@foldur/db";
import {
  getSessionIntelligence,
  listSessionsForTimeline,
  type SessionIntelligenceItem,
} from "@foldur/db";
import { useDbStore } from "../stores/db-store.ts";
import { SOURCE_OPTIONS } from "../utils/source-options.ts";

function dayGroupKey(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date(0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayHeading(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date(0);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function TimelinePage() {
  const { db, isReady, tauriContext } = useDbStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const sourceFilter = (searchParams.get("source") ?? "").trim();
  const dateFrom = (searchParams.get("from") ?? "").trim();
  const dateTo = (searchParams.get("to") ?? "").trim();

  const [rows, setRows] = useState<SessionWithSourceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [intelMap, setIntelMap] = useState<Map<string, SessionIntelligenceItem[]>>(new Map());

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const sessions = await listSessionsForTimeline(db, {
        sourceType: sourceFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 5000,
      });
      setRows(sessions);

      const map = new Map<string, SessionIntelligenceItem[]>();
      const batch = sessions.slice(0, 200);
      await Promise.all(
        batch.map(async ({ session }) => {
          const items = await getSessionIntelligence(db, session.id);
          if (items.length > 0) map.set(session.id, items);
        }),
      );
      setIntelMap(map);
    } finally {
      setLoading(false);
    }
  }, [db, sourceFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (isReady && db) void load();
  }, [isReady, db, load]);

  const grouped = useMemo(() => {
    const dayOrder: string[] = [];
    const byDay = new Map<string, SessionWithSourceType[]>();
    for (const row of rows) {
      const iso = row.session.started_at ?? row.session.created_at;
      const key = dayGroupKey(iso);
      if (!byDay.has(key)) {
        dayOrder.push(key);
        byDay.set(key, []);
      }
      byDay.get(key)!.push(row);
    }
    return dayOrder.map((key) => ({
      key,
      heading: dayHeading(
        byDay.get(key)![0]!.session.started_at ?? byDay.get(key)![0]!.session.created_at,
      ),
      items: byDay.get(key)!,
      count: byDay.get(key)!.length,
    }));
  }, [rows]);

  const maxDayCount = useMemo(() => Math.max(...grouped.map((g) => g.count), 1), [grouped]);

  const onSourceChange = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set("source", value);
      else next.delete("source");
      return next;
    });
  };

  const onDateFromChange = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set("from", value);
      else next.delete("from");
      return next;
    });
  };

  const onDateToChange = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set("to", value);
      else next.delete("to");
      return next;
    });
  };

  if (!tauriContext) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Run the Foldur desktop app to browse your sessions on a timeline.
        </p>
      </div>
    );
  }

  if (!isReady || loading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading timeline...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold">Timeline</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Sessions in chronological order with activity density and project annotations.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
          Source
          <select
            value={sourceFilter}
            onChange={(e) => onSourceChange(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-44">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
        <div className="sm:w-44">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No sessions match this filter.</p>
      ) : (
        <div className="space-y-10">
          {grouped.map((g) => (
            <section key={g.key}>
              <div className="mb-4 flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {g.heading}
                </h2>
                <span className="rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
                  {g.count}
                </span>
                <div
                  className="h-2 rounded-full bg-[var(--color-accent)]/40"
                  style={{ width: `${Math.round((g.count / maxDayCount) * 80)}px` }}
                  title={`${g.count} session${g.count !== 1 ? "s" : ""}`}
                />
              </div>
              <ul className="space-y-2">
                {g.items.map(({ session, source_type }) => {
                  const intel = intelMap.get(session.id);
                  const projectTag = intel?.find((i) => i.entity_type === "project");
                  return (
                    <li key={session.id}>
                      <Link
                        to={`/sessions/${session.id}`}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-raised)]"
                      >
                        <div className="flex min-w-0 flex-1 items-baseline gap-2">
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {session.title?.trim() || "Untitled session"}
                          </span>
                          {projectTag && (
                            <span className="inline-block max-w-[150px] truncate rounded bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                              {projectTag.label}
                            </span>
                          )}
                        </div>
                        <span className="flex flex-wrap items-center gap-2">
                          <StatusBadge label={source_type} variant="info" />
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {session.started_at
                              ? new Date(session.started_at).toLocaleTimeString(undefined, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
