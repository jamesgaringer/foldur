import { type DragEvent, type ReactNode, useCallback, useState } from "react";

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  children?: ReactNode;
}

export function FileDropZone({
  onFilesSelected,
  accept,
  children,
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
        isDragOver
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
          : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
      }`}
    >
      {children ?? (
        <div className="text-center">
          <p className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">
            Drop files here
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {accept
              ? `Accepted formats: ${accept}`
              : "Supports .json, .zip, .md files"}
          </p>
        </div>
      )}
    </div>
  );
}
