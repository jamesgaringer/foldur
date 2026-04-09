interface Warning {
  code: string;
  message: string;
  context?: Record<string, unknown> | string | null;
}

interface WarningDrawerProps {
  warnings: Warning[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function WarningDrawer({
  warnings,
  isOpen,
  onClose,
  title = "Parse Warnings",
}: WarningDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="warning-drawer-title" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--color-surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <h2 id="warning-drawer-title" className="text-sm font-semibold text-[var(--color-text-primary)]">
            {title} ({warnings.length})
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-secondary)]"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 60px)" }}>
          {warnings.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No warnings</p>
          ) : (
            <div className="flex flex-col gap-3">
              {warnings.map((w, i) => (
                <div
                  key={`${w.code}-${i}`}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded bg-yellow-900/30 px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-warning)]">
                      {w.code}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {w.message}
                  </p>
                  {w.context && (
                    <pre className="mt-2 overflow-x-auto rounded bg-[var(--color-bg)] p-2 text-xs text-[var(--color-text-muted)]">
                      {typeof w.context === "string" ? w.context : JSON.stringify(w.context, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
