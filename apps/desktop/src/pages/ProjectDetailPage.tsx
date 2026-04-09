import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { EvidenceLink, Project } from "@foldur/core";
import {
  getProjectById,
  getSessionById,
  getSurvivorProjectIdForMerged,
  listEvidenceLinksForEntity,
} from "@foldur/db";
import { useDbStore } from "../stores/db-store.ts";
import { evidenceHref } from "../utils/evidence-href.ts";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  stalled: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  speculative: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  archived: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { db, isReady, tauriContext } = useDbStore();
  const [project, setProject] = useState<Project | null>(null);
  const [evidence, setEvidence] = useState<EvidenceLink[]>([]);
  const [sessionTitles, setSessionTitles] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [mergedIntoId, setMergedIntoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!db || !projectId) { setLoading(false); return; }
    setLoading(true);
    setNotFound(false);
    setProject(null);
    setEvidence([]);
    try {
      const p = await getProjectById(db, projectId);
      if (!p) { setNotFound(true); return; }
      setProject(p);
      if (p.status === "archived") {
        setMergedIntoId(await getSurvivorProjectIdForMerged(db, projectId));
      } else {
        setMergedIntoId(null);
      }
      const links = await listEvidenceLinksForEntity(db, "project", projectId);
      setEvidence(links);
      const ids = [...new Set(links.map((l) => l.session_id))];
      const titles = new Map<string, string | null>();
      await Promise.all(ids.map(async (sid) => {
        const s = await getSessionById(db, sid);
        titles.set(sid, s?.title?.trim() ?? null);
      }));
      setSessionTitles(titles);
    } catch {
      setNotFound(true); setProject(null); setEvidence([]);
    } finally {
      setLoading(false);
    }
  }, [db, projectId]);

  useEffect(() => { if (isReady && db && projectId) void load(); }, [isReady, db, projectId, load]);

  if (!tauriContext) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Project</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Run the Foldur desktop app to view projects.</p>
      </div>
    );
  }

  if (!isReady || loading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading project...</p>;
  }

  if (notFound || !projectId || !project) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <p className="text-sm text-[var(--color-text-secondary)]">No project with this id.</p>
        <Link to="/projects" className="text-sm font-medium text-[var(--color-accent)] hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const sessionCount = new Set(evidence.map((e) => e.session_id)).size;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {mergedIntoId && (
        <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          This project was merged into another record.{" "}
          <Link to={`/projects/${mergedIntoId}`} className="font-medium text-[var(--color-accent)] hover:underline">
            Open canonical project
          </Link>.
        </div>
      )}

      <div>
        <Link to="/projects" className="mb-3 inline-block text-sm text-[var(--color-accent)] hover:underline">
          Back to projects
        </Link>
        <h1 className="mb-2 text-2xl font-semibold text-[var(--color-text-primary)]">
          {project.canonical_title}
        </h1>
        {project.description && (
          <p className="text-sm text-[var(--color-text-secondary)]">{project.description}</p>
        )}
      </div>

      {/* Metadata card */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Status</p>
          <p className="mt-1">
            <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[project.status] ?? STATUS_COLORS.speculative}`}>
              {project.status}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Confidence</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
            {Math.round(project.confidence * 100)}%
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Sessions</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{sessionCount}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Sources</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{project.source_span_count}</p>
        </div>
        {project.momentum_score != null && (
          <div>
            <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Momentum</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.round(project.momentum_score * 100)}%` }} />
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                {Math.round(project.momentum_score * 100)}%
              </span>
            </div>
          </div>
        )}
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">First seen</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {project.first_seen_at ? new Date(project.first_seen_at).toLocaleDateString() : "--"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Last seen</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {project.last_seen_at ? new Date(project.last_seen_at).toLocaleDateString() : "--"}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">Evidence</h2>
        {evidence.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No evidence links stored for this project yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-lg border border-[var(--color-border)]">
            {evidence.map((e) => {
              const st = sessionTitles.get(e.session_id);
              return (
                <li key={e.id} className="bg-[var(--color-surface)] px-4 py-4 text-sm">
                  <Link to={evidenceHref(e)} className="font-medium text-[var(--color-accent)] hover:underline">
                    {st?.trim() || "Untitled session"}
                  </Link>
                  <p className="mt-1 text-[var(--color-text-secondary)]">{e.excerpt ?? "--"}</p>
                  {e.explanation && (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">{e.explanation}</p>
                  )}
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    Score: {e.evidence_score.toFixed(2)} · {new Date(e.created_at).toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
