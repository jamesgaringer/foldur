import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { EvidenceLink, Recommendation } from "@foldur/core";
import {
  acceptRecommendation,
  dismissRecommendation,
  listEvidenceLinksForEntity,
  listOpenRecommendations,
} from "@foldur/db";
import { useDbStore } from "../stores/db-store.ts";
import { evidenceHref } from "../utils/evidence-href.ts";

const TYPE_SECTIONS: { type: string; title: string; emptyMessage: string }[] = [
  { type: "revive_stalled", title: "Stalled Projects", emptyMessage: "No stalled projects -- looking good!" },
  { type: "consolidate", title: "Consolidation Opportunities", emptyMessage: "No consolidation suggestions right now." },
  { type: "reflect_pattern", title: "Active Patterns", emptyMessage: "No active patterns detected." },
  { type: "revisit_decision", title: "Worth Revisiting", emptyMessage: "No revisit suggestions." },
  { type: "next_action", title: "Next Actions", emptyMessage: "No suggested next actions." },
  { type: "extract_plan", title: "Extract Plans", emptyMessage: "No plan extraction suggestions." },
];

export function RecommendationsPage() {
  const { db, isReady, tauriContext } = useDbStore();
  const [items, setItems] = useState<Recommendation[]>([]);
  const [evidenceByRec, setEvidenceByRec] = useState<Map<string, EvidenceLink[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const open = await listOpenRecommendations(db);
      setItems(open);
      const map = new Map<string, EvidenceLink[]>();
      await Promise.all(
        open.map(async (r) => {
          const links = await listEvidenceLinksForEntity(db, "recommendation", r.id);
          map.set(r.id, links);
        }),
      );
      setEvidenceByRec(map);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => { if (isReady && db) void load(); }, [isReady, db, load]);

  const onDismiss = async (id: string) => {
    if (!db) return;
    try {
      await dismissRecommendation(db, id);
      await load();
    } catch (err) {
      console.error("Failed to dismiss recommendation:", err);
    }
  };

  const onAccept = async (id: string) => {
    if (!db) return;
    try {
      await acceptRecommendation(db, id);
      await load();
    } catch (err) {
      console.error("Failed to accept recommendation:", err);
    }
  };

  const grouped = useMemo(() => {
    const byType = new Map<string, Recommendation[]>();
    for (const r of items) {
      const list = byType.get(r.recommendation_type) ?? [];
      list.push(r);
      byType.set(r.recommendation_type, list);
    }
    return byType;
  }, [items]);

  if (!tauriContext) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Recommendations</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Run the Foldur desktop app to view recommendations.
        </p>
      </div>
    );
  }

  if (!isReady || loading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading recommendations...</p>;
  }

  const hasAny = items.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Recommendations</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Data-driven suggestions grounded in your history. Dismiss or accept to track what you have acted on.
        </p>
      </div>

      {!hasAny && (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No open recommendations. Check{" "}
            <Link to="/projects" className="text-[var(--color-accent)] hover:underline">Projects</Link>{" "}
            or import more history.
          </p>
        </div>
      )}

      {TYPE_SECTIONS.map(({ type, title, emptyMessage }) => {
        const sectionItems = grouped.get(type);
        if (!hasAny) return null;
        return (
          <section key={type}>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
            {!sectionItems || sectionItems.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">{emptyMessage}</p>
            ) : (
              <ul className="space-y-3">
                {sectionItems.map((r) => {
                  const ev = evidenceByRec.get(r.id) ?? [];
                  const first = ev[0];
                  return (
                    <li
                      key={r.id}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-[var(--color-text-primary)]">{r.title}</p>
                        <span className="flex-shrink-0 rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
                          {Math.round(r.priority_score * 100)}%
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{r.rationale}</p>
                      {first && (
                        <p className="mt-3 text-sm">
                          <Link
                            to={evidenceHref(first)}
                            className="text-[var(--color-accent)] hover:underline"
                          >
                            Open evidence in session
                          </Link>
                          {first.excerpt && (
                            <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                              "{first.excerpt.slice(0, 160)}{first.excerpt.length > 160 ? "..." : ""}"
                            </span>
                          )}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void onAccept(r.id)}
                          className="rounded-md border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-accent)]/20"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDismiss(r.id)}
                          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]"
                        >
                          Dismiss
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
