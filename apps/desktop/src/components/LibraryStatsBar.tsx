import type { LibraryStats } from "@foldur/db";

function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-center">
      <p className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
        {value}
      </p>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}

export function LibraryStatsBar({
  stats,
  isLoading,
}: {
  stats: LibraryStats | null;
  isLoading: boolean;
}) {
  if (isLoading && !stats) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">Loading library…</p>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5">
      <Stat label="Sessions" value={stats.sessionCount} />
      <Stat label="Messages" value={stats.messageCount} />
      <Stat label="Chunks" value={stats.chunkCount} />
      <Stat label="Artifacts" value={stats.artifactCount} />
      <Stat label="Imports" value={stats.completedImportCount} />
      <Stat label="Sources" value={stats.sourceCount} />
      <Stat label="Projects" value={stats.projectCount} />
      <Stat label="Themes" value={stats.themeCount} />
      <Stat label="Open recs" value={stats.openRecommendationsCount} />
    </div>
  );
}
