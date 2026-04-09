import type { ExtractionProvider, SessionExtractionInput } from "./extraction-provider.js";
import { nowISO } from "./utils.js";

export function createNoopExtractionProvider(): ExtractionProvider {
  return {
    id: "noop",
    isLocal: true,
    async extractSession(_input: SessionExtractionInput) {
      return [];
    },
  };
}

/**
 * One speculative project per session: prefers `session.title`, otherwise the first
 * line of the first user message (up to 120 chars). Grounded by that first user
 * message. Deterministic and fully local (not semantic).
 */
export function createTitleStubExtractionProvider(): ExtractionProvider {
  return {
    id: "title-stub",
    isLocal: true,
    async extractSession({ session, messages }) {
      const sorted = [...messages].sort((a, b) => a.sort_order - b.sort_order);
      const firstUser = sorted.find((m) => m.role === "user");
      if (!firstUser) return [];

      const displayTitle =
        session.title?.trim() ||
        firstUser.content_text.trim().slice(0, 120) ||
        "";
      if (!displayTitle) return [];

      const lastMsg = sorted[sorted.length - 1]!;
      const firstSeen =
        sorted[0]?.timestamp ?? session.started_at ?? nowISO();
      const lastSeen =
        lastMsg.timestamp ?? session.updated_at ?? session.started_at ?? firstSeen;

      return [
        {
          project: {
            canonical_title: displayTitle.slice(0, 500),
            description: null,
            status: "speculative",
            confidence: 0.35,
            momentum_score: null,
            first_seen_at: firstSeen,
            last_seen_at: lastSeen,
            source_span_count: 1,
            next_action_summary: null,
          },
          evidence: [
            {
              session_id: session.id,
              message_id: firstUser.id,
              artifact_id: null,
              chunk_id: null,
              excerpt: firstUser.content_text.slice(0, 500),
              explanation:
                "Stub extraction: session title or first user line, plus first user message (local, deterministic).",
              evidence_score: 0.35,
            },
          ],
        },
      ];
    },
  };
}
