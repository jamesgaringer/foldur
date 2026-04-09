import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDbStore } from "../stores/db-store.ts";
import { useProfileStore } from "../stores/profile-store.ts";
import type { Pattern, EvidenceLink } from "@foldur/core";

const CATEGORY_COLORS: Record<string, string> = {
  behavioral: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  cognitive: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  workflow: "bg-green-500/20 text-green-400 border-green-500/30",
  temporal: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function ProfilePage() {
  const db = useDbStore((s) => s.db);
  const isReady = useDbStore((s) => s.isReady);
  const profilingStatus = useDbStore((s) => s.profilingStatus);
  const profilingError = useDbStore((s) => s.profilingError);
  const triggerProfiling = useDbStore((s) => s.triggerProfiling);

  const {
    profile,
    patterns,
    evidenceByPattern,
    ollamaHealth,
    currentTier,
    isLoading,
    refresh,
    checkOllama,
  } = useProfileStore();

  useEffect(() => {
    if (isReady && db) {
      void refresh();
      void checkOllama();
    }
  }, [isReady, db, refresh, checkOllama]);

  // Re-fetch after profiling completes
  useEffect(() => {
    if (profilingStatus === "done") {
      void refresh();
    }
  }, [profilingStatus, refresh]);

  const onAnalyze = useCallback(async () => {
    await triggerProfiling();
  }, [triggerProfiling]);

  if (isLoading && !profile) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-sm text-[var(--color-text-muted)]">
        Loading profile...
      </div>
    );
  }

  const hasProfile = profile != null;
  const hasPatterns = patterns.length > 0;
  const isLocalModel = currentTier === "local-model";
  const ollamaAvailable = ollamaHealth?.available === true;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold">Your Profile</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Deep behavioral insights derived from your conversation patterns.
          </p>
        </div>

        {isLocalModel && (
          <button
            onClick={() => void onAnalyze()}
            disabled={profilingStatus === "running"}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            {profilingStatus === "running" ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analyzing...
              </span>
            ) : (
              hasProfile ? "Re-analyze" : "Analyze Now"
            )}
          </button>
        )}
      </div>

      {/* Profiling status banner */}
      {profilingStatus === "running" && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 px-4 py-3">
          <p className="text-sm text-blue-400">
            Behavioral analysis in progress. This may take a few minutes depending on the number
            of sessions and your hardware. You can continue using the app.
          </p>
        </div>
      )}

      {profilingStatus === "error" && profilingError && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3">
          <p className="text-sm text-red-400">
            Analysis failed: {profilingError}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!hasProfile && !hasPatterns && profilingStatus !== "running" && (
        <EmptyState
          isLocalModel={isLocalModel}
          ollamaAvailable={ollamaAvailable}
          onAnalyze={onAnalyze}
        />
      )}

      {/* Profile summary */}
      {hasProfile && profile && (
        <>
          <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Profile Summary
              </h2>
              <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                {profile.model_used && (
                  <span className="rounded-full bg-[var(--color-surface-raised)] px-2 py-0.5">
                    {profile.model_used}
                  </span>
                )}
                {profile.session_count_at_computation != null && (
                  <span>{profile.session_count_at_computation} sessions analyzed</span>
                )}
                <span>
                  {new Date(profile.computed_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {profile.summary}
            </div>
          </section>

          {/* Work Style */}
          {profile.work_style && (
            <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <span className="text-lg" aria-hidden="true">
                ◆
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  Work Style
                </p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {profile.work_style}
                </p>
              </div>
            </div>
          )}

          {/* Strengths + Growth Areas */}
          <div className="grid grid-cols-2 gap-4">
            <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-green-400">
                Strengths
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.strengths.length > 0 ? (
                  profile.strengths.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    No strengths identified yet
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">
                Growth Areas
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.growth_areas.length > 0 ? (
                  profile.growth_areas.map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400"
                    >
                      {g}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    No growth areas identified yet
                  </p>
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {/* Behavioral Patterns */}
      {hasPatterns && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
            Behavioral Patterns
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
              {patterns.length} identified
            </span>
          </h2>
          <div className="space-y-3">
            {patterns.map((pattern) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                evidence={evidenceByPattern[pattern.id] ?? []}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState({
  isLocalModel,
  ollamaAvailable,
  onAnalyze,
}: {
  isLocalModel: boolean;
  ollamaAvailable: boolean;
  onAnalyze: () => Promise<void>;
}) {
  if (!isLocalModel) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--color-border)] p-12 text-center">
        <p className="text-lg font-medium text-[var(--color-text-primary)]">
          Behavioral profiling requires a local model
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          To get deep behavioral insights from your conversations, enable the Local Model
          (Ollama) provider in Settings. All analysis happens on your device.
        </p>
        <Link
          to="/settings"
          className="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  if (!ollamaAvailable) {
    return (
      <div className="rounded-lg border-2 border-dashed border-[var(--color-border)] p-12 text-center">
        <p className="text-lg font-medium text-[var(--color-text-primary)]">
          Ollama is not running
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Start Ollama on your machine and make sure a model is pulled. Then come back and click
          "Analyze Now" to generate your behavioral profile.
        </p>
        <div className="mt-4 inline-block rounded-lg bg-[var(--color-surface-raised)] px-4 py-2 text-left text-xs font-mono text-[var(--color-text-secondary)]">
          <p>$ ollama serve</p>
          <p>$ ollama pull llama3.2</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-[var(--color-border)] p-12 text-center">
      <p className="text-lg font-medium text-[var(--color-text-primary)]">
        Ready to analyze
      </p>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Ollama is connected and ready. Click below to generate your behavioral profile from your
        imported conversations. This may take a few minutes.
      </p>
      <button
        onClick={() => void onAnalyze()}
        className="mt-4 rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        Analyze Now
      </button>
    </div>
  );
}

function PatternCard({
  pattern,
  evidence,
}: {
  pattern: Pattern;
  evidence: EvidenceLink[];
}) {
  const [expanded, setExpanded] = useState(false);
  const colorClass =
    CATEGORY_COLORS[pattern.category] ?? CATEGORY_COLORS.other;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="font-medium text-[var(--color-text-primary)]">
              {pattern.label}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}
            >
              {pattern.category}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {pattern.description}
          </p>
        </div>
      </div>

      {/* Confidence + Impact bars */}
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <span>Confidence</span>
            <span>{Math.round(pattern.confidence * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)]"
              style={{ width: `${pattern.confidence * 100}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <span>Impact</span>
            <span>{pattern.impact_score != null ? `${Math.round(pattern.impact_score * 100)}%` : "—"}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${(pattern.impact_score ?? 0) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Time range */}
      <div className="mt-2 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
        <span>First seen: {new Date(pattern.first_seen_at).toLocaleDateString()}</span>
        <span>Last seen: {new Date(pattern.last_seen_at).toLocaleDateString()}</span>
      </div>

      {/* Evidence toggle */}
      {evidence.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-[var(--color-accent)] hover:underline"
          >
            {expanded ? "Hide" : "View"} evidence ({evidence.length} session
            {evidence.length !== 1 ? "s" : ""})
          </button>

          {expanded && (
            <div className="mt-2 space-y-1">
              {evidence.map((ev) => (
                <Link
                  key={ev.id}
                  to={`/sessions/${ev.session_id}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-raised)]"
                >
                  <span className="text-[var(--color-accent)]">→</span>
                  <span className="truncate">
                    Session {ev.session_id.slice(0, 8)}...
                  </span>
                  {ev.explanation && (
                    <span className="truncate text-[var(--color-text-muted)]">
                      — {ev.explanation}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
