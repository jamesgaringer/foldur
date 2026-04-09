import { describe, it, expect } from "vitest";
import { splitTextForChunks, chunksFromMessages } from "../src/chunking.js";
import type { Message } from "@foldur/core";

describe("splitTextForChunks", () => {
  it("returns one part for short text", () => {
    const parts = splitTextForChunks("hello");
    expect(parts).toHaveLength(1);
    expect(parts[0]!.text).toBe("hello");
    expect(parts[0]!.start).toBe(0);
    expect(parts[0]!.end).toBe(5);
  });

  it("splits long text into overlapping windows", () => {
    const long = "a".repeat(9000);
    const parts = splitTextForChunks(long, 8000, 200);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0]!.text.length).toBe(8000);
  });
});

describe("chunksFromMessages", () => {
  it("creates one chunk per short message", () => {
    const msg: Message = {
      id: "m1",
      session_id: "s1",
      role: "user",
      author_label: null,
      timestamp: null,
      content_text: "Hello world",
      content_hash: "x",
      raw_payload_json: null,
      sort_order: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    const chunks = chunksFromMessages("s1", [msg]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.chunk_type).toBe("message");
    expect(chunks[0]!.message_id).toBe("m1");
  });
});
