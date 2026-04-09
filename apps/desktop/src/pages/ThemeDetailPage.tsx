import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { EvidenceLink, Theme } from "@foldur/core";
import {
  getThemeById,
  getSessionById,
  listEvidenceLinksForEntity,
} from "@foldur/db";
import { useDbStore } from "../stores/db-store.ts";
import { evidenceHref } from "../utils/evidence-href.ts";

export function ThemeDetailPage() {
  const { themeId } = useParams<{ themeId: string }>();
  const { db, isReady, tauriContext } = useDbStore();
  const [theme, setTheme] = useState<Theme | null>(null);
  const [evidence, setEvidence] = useState<EvidenceLink[]>([]);
  const [sessionTitles, setSessionTitles] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!db || !themeId) { setLoading(false); return; }
    setLoading(true);
    setNotFound(false);
    setTheme(null);
    setEvidence([]);
    try {
      const t = await getThemeById(db, themeId);
      if (!t) { setNotFound(true); return; }
      setTheme(t);
      const links = await listEvidenceLinksForEntity(db, "theme", themeId);
      setEvidence(links);
      const ids = [...new Set(links.map((l) => l.session_id))];
      const titles = new Map<string, string | null>();
      await Promise.all(ids.map(async (sid) => {
        const s = await getSessionById(db, sid);
        titles.set(sid, s?.title?.trim() ?? null);
      }));
      setSessionTitles(titles);
    } catch {
      setNotFound(true); setTheme(null);
    } finally {
      setLoading(false);
    }
  }, [db, themeId]);

  useEffect(() => { if (isReady && db && themeId) void load(); }, [isReady, db, themeId, load]);

  if (!tauriContext) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Theme</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Run the Foldur desktop app to view themes.</p>
      </div>
    );
  }

  if (!isReady || loading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading theme...</p>;
  }

  if (notFound || !themeId || !theme) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <p className="text-sm text-[var(--color-text-secondary)]">No theme with this id.</p>
        <Link to="/themes" className="text-sm font-medium text-[var(--color-accent)] hover:underline">
          Back to themes
        </Link>
      </div>
    );
  }

  const sessionCount = new Set(evidence.map((e) => e.session_id)).size;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link to="/themes" className="mb-3 inline-block text-sm text-[var(--color-accent)] hover:underline">
          Back to themes
        </Link>
        <h1 className="mb-2 text-2xl font-semibold text-[var(--color-text-primary)]">{theme.label}</h1>
        {theme.description && (
          <p className="text-sm text-[var(--color-text-secondary)]">{theme.description}</p>
        )}
      </div>

      {/* Metadata card */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Confidence</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
            {Math.round(theme.confidence * 100)}%
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Sessions</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{sessionCount}</p>
        </div>
        {theme.recurrence_score != null && (
          <div>
            <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Recurrence</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.round(theme.recurrence_score * 100)}%` }} />
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                {Math.round(theme.recurrence_score * 100)}%
              </span>
            </div>
          </div>
        )}
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">First seen</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {theme.first_seen_at ? new Date(theme.first_seen_at).toLocaleDateString() : "--"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Last seen</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {theme.last_seen_at ? new Date(theme.last_seen_at).toLocaleDateString() : "--"}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">Evidence</h2>
        {evidence.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No evidence links for this theme.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-lg border border-[var(--color-border)]">
            {evidence.map((e) => {
              const st = sessionTitles.get(e.session_id);
              return (
                <li key={e.id} className="bg-[var(--color-surface)] px-4 py-4 text-sm">
                  <Link to={evidenceHref(e)} className="font-medium text-[var(--color-accent)] hover:underline">
                    {st?.trim() || "Untitled session"}
                  </Link>
                  {e.excerpt && (
                    <p className="mt-1 text-[var(--color-text-secondary)]">{e.excerpt}</p>
                  )}
                  {e.explanation && (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">{e.explanation}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
