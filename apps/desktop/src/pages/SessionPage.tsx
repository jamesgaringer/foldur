import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { StatusBadge } from "@foldur/ui";
import type { Artifact, Message } from "@foldur/core";
import {
  getArtifactsBySession,
  getChunkById,
  getMessagesBySession,
  getSessionById,
  getSessionIntelligence,
  getSessionProfile,
  getSourceById,
  type SessionIntelligenceItem,
  type SessionProfile,
} from "@foldur/db";
import { useDbStore } from "../stores/db-store.ts";
import { highlightQueryTokens } from "../utils/highlight-query.tsx";

const ROLE_VARIANTS: Record<
  string,
  "default" | "success" | "warning" | "error" | "info"
> = {
  user: "info",
  assistant: "success",
  system: "warning",
  tool: "default",
  unknown: "default",
};

function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getScrollMain(): HTMLElement | null {
  return document.querySelector("main");
}

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const chunkIdFromUrl = searchParams.get("chunk");
  const highlightQuery = (searchParams.get("q") ?? "").trim();
  const navigate = useNavigate();
  const { db, isReady, tauriContext } = useDbStore();

  const [title, setTitle] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(
    null,
  );
  const [highlightArtifactId, setHighlightArtifactId] = useState<string | null>(
    null,
  );
  const [highlightFlash, setHighlightFlash] = useState(false);
  const [sessionProfile, setSessionProfile] = useState<SessionProfile | null>(null);
  const [intelligence, setIntelligence] = useState<SessionIntelligenceItem[]>([]);

  const sessionBodyRef = useRef<HTMLDivElement>(null);
  const [matchMarks, setMatchMarks] = useState<HTMLElement[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [showScrollTopFab, setShowScrollTopFab] = useState(false);

  const load = useCallback(async () => {
    if (!db || !sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const session = await getSessionById(db, sessionId);
      if (!session) {
        setNotFound(true);
        return;
      }
      const source = await getSourceById(db, session.source_id);
      setTitle(session.title?.trim() || null);
      setSourceType(source?.type ?? null);
      setStartedAt(session.started_at);
      const [msgRows, artRows, profile, intel] = await Promise.all([
        getMessagesBySession(db, session.id),
        getArtifactsBySession(db, session.id),
        getSessionProfile(db, session.id),
        getSessionIntelligence(db, session.id),
      ]);
      setMessages(msgRows);
      setArtifacts(artRows);
      setSessionProfile(profile);
      setIntelligence(intel);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [db, sessionId]);

  useEffect(() => {
    if (!isReady || !tauriContext || !sessionId) return;
    void load();
  }, [isReady, tauriContext, sessionId, load]);

  useEffect(() => {
    setHighlightMessageId(null);
    setHighlightArtifactId(null);
    setHighlightFlash(false);
  }, [sessionId, chunkIdFromUrl]);

  useEffect(() => {
    if (!db || !chunkIdFromUrl || !sessionId || loading) return;
    let cancelled = false;
    void (async () => {
      const chunk = await getChunkById(db, chunkIdFromUrl);
      if (cancelled || !chunk || chunk.session_id !== sessionId) return;
      if (chunk.artifact_id) {
        setHighlightArtifactId(chunk.artifact_id);
        if (chunk.message_id) setHighlightMessageId(chunk.message_id);
      } else if (chunk.message_id) {
        setHighlightMessageId(chunk.message_id);
      }
      setHighlightFlash(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [db, chunkIdFromUrl, sessionId, loading]);

  /** Deep links from project evidence, etc.: /sessions/:id#message-… or #artifact-… */
  useEffect(() => {
    if (!sessionId || loading) return;
    if (chunkIdFromUrl) return;
    if (highlightQuery) return;

    const raw = location.hash.replace(/^#/, "");
    if (!raw) {
      setHighlightMessageId(null);
      setHighlightArtifactId(null);
      setHighlightFlash(false);
      return;
    }

    let messageId: string | null = null;
    let artifactId: string | null = null;
    if (raw.startsWith("message-")) {
      messageId = raw.slice("message-".length);
    } else if (raw.startsWith("artifact-")) {
      artifactId = raw.slice("artifact-".length);
    } else {
      setHighlightMessageId(null);
      setHighlightArtifactId(null);
      setHighlightFlash(false);
      return;
    }

    if (messageId) {
      setHighlightMessageId(messageId);
      setHighlightArtifactId(null);
      setHighlightFlash(true);
    } else if (artifactId) {
      setHighlightArtifactId(artifactId);
      setHighlightMessageId(null);
      setHighlightFlash(true);
    }
  }, [
    sessionId,
    loading,
    chunkIdFromUrl,
    highlightQuery,
    location.hash,
  ]);

  useEffect(() => {
    if (!highlightMessageId && !highlightArtifactId) return;
    if (highlightQuery && matchMarks.length > 0) return;
    const domId = highlightArtifactId
      ? `artifact-${highlightArtifactId}`
      : highlightMessageId
        ? `message-${highlightMessageId}`
        : null;
    if (!domId) return;
    const t = window.setTimeout(() => {
      document.getElementById(domId)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
    return () => window.clearTimeout(t);
  }, [
    highlightQuery,
    highlightMessageId,
    highlightArtifactId,
    messages,
    artifacts,
    matchMarks.length,
  ]);

  useLayoutEffect(() => {
    if (!sessionBodyRef.current || !highlightQuery) {
      setMatchMarks([]);
      setActiveMatchIndex(0);
      return;
    }
    const marks = [
      ...sessionBodyRef.current.querySelectorAll("mark"),
    ] as HTMLElement[];
    setMatchMarks(marks);
    if (marks.length === 0) {
      setActiveMatchIndex(0);
      return;
    }

    let start = 0;
    if (highlightArtifactId) {
      const el = document.getElementById(`artifact-${highlightArtifactId}`);
      const idx = el ? marks.findIndex((m) => el.contains(m)) : -1;
      if (idx >= 0) start = idx;
    } else if (highlightMessageId) {
      const el = document.getElementById(`message-${highlightMessageId}`);
      const idx = el ? marks.findIndex((m) => el.contains(m)) : -1;
      if (idx >= 0) start = idx;
    }
    setActiveMatchIndex(start);
  }, [
    highlightQuery,
    messages,
    artifacts,
    highlightMessageId,
    highlightArtifactId,
  ]);

  useEffect(() => {
    if (matchMarks.length === 0 || !highlightQuery) return;
    const idx = Math.min(activeMatchIndex, matchMarks.length - 1);
    const el = matchMarks[idx];
    if (!el) return;

    matchMarks.forEach((m, i) => {
      if (i === idx) {
        m.style.outline = "2px solid var(--color-accent)";
        m.style.outlineOffset = "2px";
      } else {
        m.style.outline = "";
        m.style.outlineOffset = "";
      }
    });

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => {
      matchMarks.forEach((m) => {
        m.style.outline = "";
        m.style.outlineOffset = "";
      });
    };
  }, [activeMatchIndex, matchMarks, highlightQuery]);

  const goPrevMatch = useCallback(() => {
    const n = matchMarks.length;
    if (n === 0) return;
    setActiveMatchIndex((i) => (i - 1 + n) % n);
  }, [matchMarks.length]);

  const goNextMatch = useCallback(() => {
    const n = matchMarks.length;
    if (n === 0) return;
    setActiveMatchIndex((i) => (i + 1) % n);
  }, [matchMarks.length]);

  const scrollMainToTop = useCallback(() => {
    getScrollMain()?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const main = getScrollMain();
    if (!main) return;
    const onScroll = () => setShowScrollTopFab(main.scrollTop > 420);
    main.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => main.removeEventListener("scroll", onScroll);
  }, [sessionId, loading]);

  useEffect(() => {
    if (!highlightFlash) return;
    const t = window.setTimeout(() => setHighlightFlash(false), 4500);
    return () => window.clearTimeout(t);
  }, [highlightFlash]);

  const artifactsByMessage = useMemo(() => {
    const map = new Map<string, Artifact[]>();
    for (const a of artifacts) {
      if (!a.message_id) continue;
      const list = map.get(a.message_id) ?? [];
      list.push(a);
      map.set(a.message_id, list);
    }
    return map;
  }, [artifacts]);

  const orphanArtifacts = useMemo(
    () => artifacts.filter((a) => !a.message_id),
    [artifacts],
  );

  if (!tauriContext) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Open this app from the Foldur desktop window to view conversations.
        </p>
      </div>
    );
  }

  if (!isReady) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>;
  }

  if (!sessionId) {
    return <p className="text-sm text-[var(--color-error)]">Missing session.</p>;
  }

  if (loading && !loadError && !notFound) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading conversation…</p>;
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          ← Back
        </button>
        <p className="text-sm text-[var(--color-error)]">{loadError}</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link
          to="/search"
          className="text-sm text-[var(--color-accent)] hover:underline"
        >
          ← Back to search
        </Link>
        <p className="text-[var(--color-text-secondary)]">
          This conversation could not be found. It may have been removed from the library.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/search"
            className="mb-3 inline-block text-sm text-[var(--color-accent)] hover:underline"
          >
            ← Back to search
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {title || "Untitled conversation"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {sourceType && (
              <StatusBadge label={sourceType} variant="info" />
            )}
            <span className="text-xs text-[var(--color-text-muted)]">
              {startedAt
                ? new Date(startedAt).toLocaleString()
                : "Date unknown"}
            </span>
          </div>
        </div>
      </div>

      {/* Session summary card */}
      {sessionProfile && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Messages</span>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {sessionProfile.message_count}
                <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">
                  ({sessionProfile.user_msg_count} user / {sessionProfile.assistant_msg_count} assistant)
                </span>
              </p>
            </div>
            {sessionProfile.duration_minutes != null && (
              <div>
                <span className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Duration</span>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {sessionProfile.duration_minutes < 60
                    ? `${Math.round(sessionProfile.duration_minutes)} min`
                    : `${(sessionProfile.duration_minutes / 60).toFixed(1)} hr`}
                </p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium uppercase text-[var(--color-text-muted)]">Words</span>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {sessionProfile.word_count.toLocaleString()}
              </p>
            </div>
          </div>
          {sessionProfile.top_keywords.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sessionProfile.top_keywords.slice(0, 10).map((kw) => (
                <span
                  key={kw}
                  className="rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-accent)]"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Related intelligence */}
      {intelligence.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
            Related intelligence
          </h2>
          <div className="flex flex-wrap gap-2">
            {intelligence.map((item) => (
              <Link
                key={`${item.entity_type}-${item.entity_id}`}
                to={item.entity_type === "project" ? `/projects/${item.entity_id}` : `/themes/${item.entity_id}`}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-raised)]"
              >
                <span className="text-[var(--color-text-muted)]">
                  {item.entity_type === "project" ? "P" : "T"}
                </span>
                <span className="max-w-[200px] truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {highlightQuery && (
        <div className="sticky top-0 z-20 -mx-2 mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/95 px-3 py-2 shadow-sm backdrop-blur-sm">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            Search in session
          </span>
          <button
            type="button"
            onClick={goPrevMatch}
            disabled={matchMarks.length === 0}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous match
          </button>
          <button
            type="button"
            onClick={goNextMatch}
            disabled={matchMarks.length === 0}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next match
          </button>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {matchMarks.length === 0
              ? "No matches"
              : `Match ${activeMatchIndex + 1} of ${matchMarks.length}`}
          </span>
          <button
            type="button"
            onClick={scrollMainToTop}
            className="ml-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]"
          >
            Top
          </button>
        </div>
      )}

      {messages.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          No messages in this session.
        </p>
      )}

      <div ref={sessionBodyRef} className="space-y-6">
        <div className="space-y-4">
        {messages.map((m) => (
          <div key={m.id}>
            <article
              id={`message-${m.id}`}
              className={`rounded-lg border p-4 transition-shadow duration-300 ${
                m.role === "user"
                  ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5"
                  : "border-[var(--color-border)] bg-[var(--color-surface)]"
              } ${
                highlightFlash &&
                highlightMessageId === m.id &&
                !highlightArtifactId
                  ? "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg)]"
                  : ""
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={roleLabel(m.role)}
                  variant={ROLE_VARIANTS[m.role] ?? "default"}
                />
                {m.timestamp && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {new Date(m.timestamp).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">
                {highlightQuery
                  ? highlightQueryTokens(m.content_text, highlightQuery)
                  : m.content_text}
              </p>
            </article>
            {(artifactsByMessage.get(m.id) ?? []).map((a) => (
              <div
                key={a.id}
                id={`artifact-${a.id}`}
                className={`ml-0 mt-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-3 sm:ml-6 transition-shadow duration-300 ${
                  highlightFlash && highlightArtifactId === a.id
                    ? "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg)]"
                    : ""
                }`}
              >
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  {a.artifact_type}
                  {a.title ? ` · ${a.title}` : ""}
                </p>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">
                  {highlightQuery
                    ? highlightQueryTokens(a.content_text, highlightQuery)
                    : a.content_text}
                </pre>
              </div>
            ))}
          </div>
        ))}
        </div>

      {orphanArtifacts.length > 0 && (
        <div className="border-t border-[var(--color-border)] pt-6">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
            Other artifacts
          </h2>
          <div className="space-y-3">
            {orphanArtifacts.map((a) => (
              <div
                key={a.id}
                id={`artifact-${a.id}`}
                className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-shadow duration-300 ${
                  highlightFlash && highlightArtifactId === a.id
                    ? "ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg)]"
                    : ""
                }`}
              >
                <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">
                  {a.artifact_type}
                  {a.title ? ` · ${a.title}` : ""}
                </p>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-[var(--color-text-secondary)]">
                  {highlightQuery
                    ? highlightQueryTokens(a.content_text, highlightQuery)
                    : a.content_text}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {showScrollTopFab && (
        <button
          type="button"
          onClick={scrollMainToTop}
          className="fixed bottom-8 right-8 z-30 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] shadow-lg hover:bg-[var(--color-surface-raised)]"
          aria-label="Scroll to top"
        >
          ↑ Top
        </button>
      )}
    </div>
  );
}
