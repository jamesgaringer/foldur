import { useCallback, useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { FileDropZone, StatusBadge, DataTable, WarningDrawer, ProgressSteps } from "@foldur/ui";
import type { Column } from "@foldur/ui";
import type { ImportBatch } from "@foldur/core";
import { SEARCH_INDEX_VERSION } from "@foldur/core";
import { useImportStore } from "../stores/import-store.ts";
import { useDbStore } from "../stores/db-store.ts";

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  pending: "default",
  validating: "info",
  parsing: "info",
  normalizing: "info",
  completed: "success",
  failed: "error",
};

const importColumns: Column<ImportBatch>[] = [
  {
    key: "file_name",
    header: "File",
    render: (row) => (
      <span className="font-medium text-[var(--color-text-primary)]">{row.file_name}</span>
    ),
  },
  {
    key: "source",
    header: "Source",
    render: (row) => <StatusBadge label={row.source_id} variant="info" />,
  },
  {
    key: "imported_at",
    header: "Imported",
    render: (row) => new Date(row.imported_at).toLocaleDateString(),
  },
  {
    key: "sessions",
    header: "Sessions",
    render: (row) => row.session_count,
    className: "text-right w-24",
  },
  {
    key: "warnings",
    header: "Warnings",
    render: (row) =>
      row.warning_count > 0 ? (
        <StatusBadge label={String(row.warning_count)} variant="warning" />
      ) : (
        <span className="text-[var(--color-text-muted)]">0</span>
      ),
    className: "w-24",
  },
  {
    key: "search_index",
    header: "Search index",
    render: (row) =>
      row.status === "completed" &&
      row.search_index_version >= SEARCH_INDEX_VERSION ? (
        <StatusBadge label={`v${row.search_index_version}`} variant="success" />
      ) : row.status === "completed" ? (
        <StatusBadge label="Pending" variant="warning" />
      ) : (
        <span className="text-[var(--color-text-muted)]">—</span>
      ),
    className: "w-32",
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <StatusBadge
        label={row.status}
        variant={STATUS_VARIANTS[row.status] ?? "default"}
      />
    ),
    className: "w-28",
  },
];

function progressToSteps(stage: string | null) {
  const stages = [
    "detecting",
    "validating",
    "parsing",
    "normalizing",
    "persisting",
    "indexing",
    "embedding",
    "extracting",
  ];
  return stages.map((s) => ({
    label: s.charAt(0).toUpperCase() + s.slice(1),
    status: !stage
      ? ("pending" as const)
      : stage === "completed"
        ? ("completed" as const)
        : s === stage
          ? ("active" as const)
          : stages.indexOf(s) < stages.indexOf(stage)
            ? ("completed" as const)
            : ("pending" as const),
  }));
}

export function ImportCenter() {
  const { isReady, error: dbError, tauriContext } = useDbStore();
  const {
    isImporting,
    currentProgress,
    lastResult,
    importHistory,
    selectedBatchWarnings,
    runImport,
    loadHistory,
    selectBatch,
  } = useImportStore();

  const [warningDrawerOpen, setWarningDrawerOpen] = useState(false);

  useEffect(() => {
    if (isReady) {
      loadHistory();
    }
  }, [isReady, loadHistory]);

  const handleFileSelect = useCallback(
    async (files: File[]) => {
      const fileInputs = await Promise.all(
        files.map(async (f) => ({
          data: await f.arrayBuffer(),
          fileName: f.name,
        })),
      );
      await runImport(fileInputs);
    },
    [runImport],
  );

  const handleNativeFilePicker = useCallback(async () => {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "AI Exports",
          extensions: ["json", "zip", "md", "markdown", "txt"],
        },
      ],
    });

    if (!selected) return;

    const paths = Array.isArray(selected) ? selected : [selected];
    const fileInputs = await Promise.all(
      paths.map(async (path) => {
        const bytes = await readFile(path);
        return {
          data: bytes.buffer as ArrayBuffer,
          fileName: path.split(/[\\/]/).pop() ?? path,
        };
      }),
    );

    await runImport(fileInputs);
  }, [runImport]);

  const handleRowClick = useCallback(
    (batch: ImportBatch) => {
      if (batch.warning_count > 0) {
        selectBatch(batch.id);
        setWarningDrawerOpen(true);
      }
    },
    [selectBatch],
  );

  if (!tauriContext) {
    return (
      <div className="mx-auto max-w-lg space-y-3 text-center">
        <h1 className="text-2xl font-semibold">Import Center</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Imports use the Tauri desktop shell. If you opened{" "}
          <code className="rounded bg-[var(--color-surface)] px-1">localhost:5173</code> in a normal
          browser, close it and use the Foldur window from{" "}
          <code className="rounded bg-[var(--color-surface)] px-1">pnpm tauri dev</code> instead.
        </p>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-sm font-medium text-[var(--color-error)]">
            Database initialization failed
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">{dbError}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Initializing local database...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Import Center</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Import your AI conversation history to build your personal
          intelligence map. All data stays on your device.
        </p>
      </div>

      {/* File import zone */}
      <FileDropZone onFilesSelected={handleFileSelect}>
        <div className="text-center">
          <p className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">
            {isImporting ? "Importing..." : "Drop AI export files here"}
          </p>
          <p className="mb-4 text-xs text-[var(--color-text-muted)]">
            Supports ChatGPT exports (.json, .zip), markdown, and generic
            JSON transcripts
          </p>
          {!isImporting && (
            <button
              type="button"
              onClick={handleNativeFilePicker}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Browse files
            </button>
          )}
        </div>
      </FileDropZone>

      {/* Progress indicator */}
      {isImporting && currentProgress && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Importing {currentProgress.fileName}
            </p>
          </div>
          <ProgressSteps steps={progressToSteps(currentProgress.stage)} />
        </div>
      )}

      {/* Last result */}
      {lastResult && !isImporting && (
        <div
          className={`rounded-lg border p-4 ${
            lastResult.status === "completed"
              ? "border-green-800/50 bg-green-900/10"
              : "border-red-800/50 bg-red-900/10"
          }`}
        >
          <p className="text-sm">
            {lastResult.status === "completed" ? (
              <span className="text-[var(--color-success)]">
                Imported {lastResult.sessionCount} session
                {lastResult.sessionCount !== 1 ? "s" : ""} from{" "}
                {lastResult.sourceType}
                {lastResult.warningCount > 0 &&
                  ` with ${lastResult.warningCount} warning${lastResult.warningCount !== 1 ? "s" : ""}`}
              </span>
            ) : (
              <span className="text-[var(--color-error)]">
                Import failed: {lastResult.error}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Import history */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Import History</h2>
        <DataTable
          columns={importColumns}
          data={importHistory}
          keyExtractor={(row) => row.id}
          emptyMessage="No imports yet. Drop a file above to get started."
          onRowClick={handleRowClick}
        />
      </div>

      {/* Warning drawer */}
      <WarningDrawer
        warnings={selectedBatchWarnings.map((w) => ({
          code: w.code,
          message: w.message,
          context: w.context_json,
        }))}
        isOpen={warningDrawerOpen}
        onClose={() => {
          setWarningDrawerOpen(false);
          selectBatch(null);
        }}
      />
    </div>
  );
}
