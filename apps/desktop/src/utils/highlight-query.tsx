import { Fragment, type ReactNode } from "react";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wraps whitespace-separated tokens from `query` in `<mark>` (case-insensitive).
 * Returns plain `text` when `query` is empty after trim.
 */
export function highlightQueryTokens(text: string, query: string): ReactNode {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return text;

  const pattern = new RegExp(`(${tokens.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const matched = tokens.some(
      (t) => t.toLowerCase() === part.toLowerCase(),
    );
    if (matched) {
      return (
        <mark
          key={i}
          className="rounded-sm bg-amber-500/35 px-0.5 text-inherit dark:bg-amber-400/25"
        >
          {part}
        </mark>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
