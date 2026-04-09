import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "@foldur/ui";
import {
  ftsMatchQueryFromUserInput,
  searchChunks,
  type SearchHit,
} from "@foldur/db";
import { useDbStore } from "../stores/db-store.ts";
import { defaultEmbeddingProvider } from "../embedding-default.ts";
import { SOURCE_OPTIONS } from "../utils/source-options.ts";

export function SearchPage() {
  const { db, isReady, tauriContext } = useDbStore();
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const runSearch = useCallback(async () => {
    if (!db) return;
    const fts = ftsMatchQueryFromUserInput(query);
    if (!fts) {
      setHits([]);
      setError(null);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const [queryEmbedding] = await defaultEmbeddingProvider.embed([
        query.trim(),
      ]);
      const results = await searchChunks(db, fts, {
        limit: 75,
        sourceType: sourceFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        queryEmbedding:
          queryEmbedding.length === defaultEmbeddingProvider.dimension
            ? queryEmbedding
            : undefined,
      });
      setHits(results);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setHits([]);
    } finally {
      setSearching(false);
    }
  }, [db, query, sourceFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!isReady || !tauriContext) return;
    const t = window.setTimeout(() => {
      runSearch();
    }, 300);
    return () => window.clearTimeout(t);
  }, [isReady, tauriContext, query, sourceFilter, dateFrom, dateTo, runSearch]);

  if (!tauriContext) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="mb-3 text-2xl font-semibold">Search</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Open Foldur from <code className="rounded bg-[var(--color-surface)] px-1">pnpm tauri dev</code>{" "}
          to search your local library.
        </p>
      </div>
    );
  }

  if (!isReady) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading database…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Search</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Full-text search (SQLite FTS5) with optional reranking using a local deterministic
          embedding—no query text is sent to the network. Results blend lexical relevance with
          vector similarity when chunks have embeddings.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
              Query
            </label>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Words to find (AND between terms)"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
          <div className="sm:w-48">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
              Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => runSearch()}
            disabled={searching}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-44">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
              Session from (optional)
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
          <div className="sm:w-44">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">
              Session to (optional)
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </div>
          <p className="flex-1 pb-1 text-xs text-[var(--color-text-muted)] sm:pb-2">
            Filters by conversation start (or import time if missing). Inclusive dates.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/10 px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      {!query.trim() && (
        <p className="text-sm text-[var(--color-text-muted)]">Type a query to search your history.</p>
      )}

      {query.trim() && !searching && hits.length === 0 && !error && (
        <p className="text-sm text-[var(--color-text-secondary)]">No matches.</p>
      )}

      {hits.length > 0 && (
        <ul className="space-y-3">
          {hits.map((h) => {
            const q = query.trim();
            const searchParams = new URLSearchParams();
            searchParams.set("chunk", h.chunk_id);
            if (q) searchParams.set("q", q);
            return (
            <li key={h.chunk_id}>
              <Link
                to={`/sessions/${h.session_id}?${searchParams.toString()}`}
                className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)]"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {h.session_title?.trim() || "Untitled session"}
                  </span>
                  <StatusBadge label={h.source_type} variant="info" />
                  <span className="text-xs text-[var(--color-text-muted)]">
                    BM25 {Number(h.rank).toFixed(2)}
                  </span>
                  <span className="ml-auto text-xs font-medium text-[var(--color-accent)]">
                    Open conversation →
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {h.snippet}
                  {h.snippet.length >= 320 ? "…" : ""}
                </p>
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
