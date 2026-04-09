import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { confirm, message } from "@tauri-apps/plugin-dialog";
import {
  mergeProjectsIntoCanonical,
  recomputeProjectMergeCandidates,
  listMergeCandidatesDetailed,
  type MergeCandidateListRow,
  type ProjectWithActivity,
} from "@foldur/db";
import { useDbStore } from "../stores/db-store.ts";
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

type SortKey = "recent" | "sessions" | "name";
type StatusFilter = "all" | "active" | "stalled" | "speculative";

export function ProjectsPage() {
  const { db, isReady, tauriContext } = useDbStore();
  const { allProjects, refreshProjects } = useAnalyticsStore();
  const [candidates, setCandidates] = useState<MergeCandidateListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  const loadCandidates = useCallback(async () => {
    if (!db) return;
    setCandidates(await listMergeCandidatesDetailed(db));
  }, [db]);

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      await refreshProjects();
      await loadCandidates();
    } finally {
      setLoading(false);
    }
  }, [db, loadCandidates, refreshProjects]);

  const refreshAll = useCallback(async () => {
    if (!db) return;
    try {
      await refreshProjects();
      setCandidates(await listMergeCandidatesDetailed(db));
    } catch (e) {
      console.error("[Foldur] refresh projects:", e);
    }
  }, [db, refreshProjects]);

  const onScanDuplicates = useCallback(async () => {
    if (!db) return;
    setMergeBusy(true);
    try {
      await recomputeProjectMergeCandidates(db);
      await refreshAll();
    } finally {
      setMergeBusy(false);
    }
  }, [db, refreshAll]);

  const onMergePair = useCallback(
    async (survivorId: string, mergedId: string) => {
      if (!db) return;
      const ok = await confirm(
        "Merge into the chosen project? Evidence moves to that project; the other is archived. This cannot be undone.",
        { title: "Confirm merge", kind: "warning" },
      );
      if (!ok) return;
      setMergeBusy(true);
      try {
        await mergeProjectsIntoCanonical(db, survivorId, mergedId);
        await refreshAll();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("[Foldur] merge:", msg);
        await refreshAll();
        await message(
          msg.includes("already absorbed into a different")
            ? "That project was already merged into another canonical project. The list was refreshed."
            : `Merge could not complete: ${msg}`,
          { title: "Merge error", kind: "error" },
        );
      } finally {
        setMergeBusy(false);
      }
    },
    [db, refreshAll],
  );

  useEffect(() => {
    if (isReady && db) void load();
  }, [isReady, db, load]);

  const filtered = useMemo(() => {
    let list: ProjectWithActivity[] = allProjects;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    const sorted = [...list];
    switch (sortKey) {
      case "sessions":
        sorted.sort((a, b) => b.session_count - a.session_count);
        break;
      case "name":
        sorted.sort((a, b) => a.canonical_title.localeCompare(b.canonical_title));
        break;
      default:
        sorted.sort((a, b) =>
          new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime(),
        );
    }
    return sorted;
  }, [allProjects, statusFilter, sortKey]);

  if (!tauriContext) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Run <code className="rounded bg-[var(--color-surface)] px-1">pnpm tauri dev</code>{" "}
          to use the local database from the Foldur window.
        </p>
      </div>
    );
  }

  if (!isReady || loading) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">Loading projects...</p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Initiatives inferred from your history. Each is backed by evidence links to source sessions.
          Projects are enriched with status, momentum, and descriptions automatically.
        </p>
      </div>

      {/* Duplicates section */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">
          Possible duplicates
        </h2>
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
          Local deterministic scoring on titles, descriptions, and time spans.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={mergeBusy}
            onClick={() => void onScanDuplicates()}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            {mergeBusy ? "Working..." : "Scan for duplicates"}
          </button>
        </div>

        {candidates.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            No duplicate suggestions yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--color-border)] overflow-hidden rounded-lg border border-[var(--color-border)]">
            {candidates.map(({ candidate, title_a, title_b }) => (
              <li
                key={candidate.id}
                className="flex flex-col gap-3 bg-[var(--color-surface-raised)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--color-text-primary)]">
                    <span className="font-medium">{title_a}</span>
                    <span className="text-[var(--color-text-muted)]"> vs </span>
                    <span className="font-medium">{title_b}</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {Math.round(candidate.score_combined * 100)}% match
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={mergeBusy}
                    onClick={() => void onMergePair(candidate.project_a_id, candidate.project_b_id)}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] disabled:opacity-50"
                  >
                    Keep "{title_a.slice(0, 30)}{title_a.length > 30 ? "..." : ""}"
                  </button>
                  <button
                    type="button"
                    disabled={mergeBusy}
                    onClick={() => void onMergePair(candidate.project_b_id, candidate.project_a_id)}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] disabled:opacity-50"
                  >
                    Keep "{title_b.slice(0, 30)}{title_b.length > 30 ? "..." : ""}"
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Filters + sort */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="stalled">Stalled</option>
            <option value="speculative">Speculative</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          Sort
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text-primary)]"
          >
            <option value="recent">Recent activity</option>
            <option value="sessions">Most sessions</option>
            <option value="name">Name</option>
          </select>
        </label>
        <span className="ml-auto text-xs text-[var(--color-text-muted)]">
          {filtered.length} project{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {allProjects.length === 0
              ? "No projects yet. Import conversations from the Import tab."
              : "No projects match this filter."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-lg border border-[var(--color-border)]">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                to={`/projects/${p.id}`}
                className="block bg-[var(--color-surface)] px-4 py-4 transition-colors hover:bg-[var(--color-surface-raised)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {p.canonical_title}
                    </p>
                    {p.description && (
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ACTIVITY_BADGE[p.activity_level] ?? ACTIVITY_BADGE.cold}`}>
                      {p.activity_level}
                    </span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[p.status] ?? STATUS_COLORS.speculative}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
                  <span>{p.session_count} session{p.session_count !== 1 ? "s" : ""}</span>
                  {p.source_span_count > 1 && (
                    <span>{p.source_span_count} sources</span>
                  )}
                  <span>
                    {Math.round(p.confidence * 100)}% confidence
                  </span>
                  {p.momentum_score != null && p.momentum_score > 0 && (
                    <span>
                      <span
                        className="mr-1 inline-block h-1.5 rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${Math.round(p.momentum_score * 40)}px` }}
                      />
                      momentum
                    </span>
                  )}
                  <span className="ml-auto">
                    last seen{" "}
                    {p.last_seen_at ? new Date(p.last_seen_at).toLocaleDateString() : "--"}
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
