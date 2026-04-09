import { describe, it, expect } from "vitest";
import { createNoopExtractionProvider, createTitleStubExtractionProvider } from "../src/extraction-stubs.js";
import type { Message } from "../src/schemas/message.js";
import type { Session } from "../src/schemas/session.js";

function minimalSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess-1",
    source_id: "src-1",
    import_batch_id: "batch-1",
    external_id: null,
    title: "My project title",
    started_at: "2026-01-01T00:00:00.000Z",
    ended_at: null,
    session_type: "conversation",
    metadata_json: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function userMessage(id: string, text: string, order: number): Message {
  return {
    id,
    session_id: "sess-1",
    role: "user",
    author_label: null,
    timestamp: "2026-01-01T01:00:00.000Z",
    content_text: text,
    content_hash: "h",
    raw_payload_json: null,
    sort_order: order,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("createNoopExtractionProvider", () => {
  it("returns no candidates", async () => {
    const p = createNoopExtractionProvider();
    const out = await p.extractSession({
      session: minimalSession(),
      messages: [userMessage("m1", "hi", 0)],
      artifacts: [],
    });
    expect(out).toEqual([]);
  });
});

describe("createTitleStubExtractionProvider", () => {
  it("uses first user line when session title is missing", async () => {
    const p = createTitleStubExtractionProvider();
    const out = await p.extractSession({
      session: minimalSession({ title: null }),
      messages: [userMessage("m1", "hi", 0)],
      artifacts: [],
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.project.canonical_title).toBe("hi");
  });

  it("returns empty when there is no user message", async () => {
    const p = createTitleStubExtractionProvider();
    const out = await p.extractSession({
      session: minimalSession({ title: null }),
      messages: [{ ...userMessage("m1", "assistant only", 0), role: "assistant" }],
      artifacts: [],
    });
    expect(out).toEqual([]);
  });

  it("returns one project and evidence for titled session with user message", async () => {
    const p = createTitleStubExtractionProvider();
    const out = await p.extractSession({
      session: minimalSession(),
      messages: [
        userMessage("m1", "First line", 0),
        {
          ...userMessage("m2", "assistant reply", 1),
          role: "assistant",
        },
      ],
      artifacts: [],
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.project.canonical_title).toBe("My project title");
    expect(out[0]!.evidence).toHaveLength(1);
    expect(out[0]!.evidence[0]!.message_id).toBe("m1");
    expect(out[0]!.evidence[0]!.session_id).toBe("sess-1");
  });
});
