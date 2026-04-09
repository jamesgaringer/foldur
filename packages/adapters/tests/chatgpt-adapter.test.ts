import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ChatGPTAdapter } from "../src/chatgpt/chatgpt-adapter.js";

function loadFixture(name: string): ArrayBuffer {
  const path = resolve(__dirname, "fixtures", name);
  const buf = readFileSync(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("ChatGPTAdapter", () => {
  const adapter = new ChatGPTAdapter();

  describe("canParse", () => {
    it("accepts a valid ChatGPT JSON export", async () => {
      const data = loadFixture("chatgpt-export.json");
      expect(await adapter.canParse(data, "chatgpt-export.json")).toBe(true);
    });

    it("rejects a non-JSON file", async () => {
      const data = new TextEncoder().encode("not json").buffer;
      expect(await adapter.canParse(data, "readme.md")).toBe(false);
    });

    it("rejects a JSON object (not array)", async () => {
      const data = new TextEncoder().encode('{"key": "value"}').buffer;
      expect(await adapter.canParse(data, "data.json")).toBe(false);
    });
  });

  describe("parseRaw", () => {
    it("parses the fixture without throwing", async () => {
      const data = loadFixture("chatgpt-export.json");
      const result = await adapter.parseRaw(data, "chatgpt-export.json");

      expect(result.sourceType).toBe("chatgpt");
      expect(result.fileHash).toBeTruthy();
      expect(Array.isArray(result.rawPayload)).toBe(true);
      expect((result.rawPayload as unknown[]).length).toBe(2);
    });
  });

  describe("normalize", () => {
    it("produces the correct number of sessions", async () => {
      const data = loadFixture("chatgpt-export.json");
      const raw = await adapter.parseRaw(data, "chatgpt-export.json");
      const result = adapter.normalize(raw, "source-1", "batch-1");

      expect(result.sessions.length).toBe(2);
    });

    it("extracts messages in correct order", async () => {
      const data = loadFixture("chatgpt-export.json");
      const raw = await adapter.parseRaw(data, "chatgpt-export.json");
      const result = adapter.normalize(raw, "source-1", "batch-1");

      const session1 = result.sessions[0]!;
      expect(session1.session.title).toBe("Building a CLI tool");
      expect(session1.messages.length).toBe(4);
      expect(session1.messages[0]!.role).toBe("user");
      expect(session1.messages[1]!.role).toBe("assistant");
      expect(session1.messages[0]!.sort_order).toBe(0);
      expect(session1.messages[3]!.sort_order).toBe(3);
    });

    it("extracts code artifacts from messages", async () => {
      const data = loadFixture("chatgpt-export.json");
      const raw = await adapter.parseRaw(data, "chatgpt-export.json");
      const result = adapter.normalize(raw, "source-1", "batch-1");

      const session1 = result.sessions[0]!;
      expect(session1.artifacts.length).toBe(2);
      expect(session1.artifacts[0]!.artifact_type).toBe("code");
      expect(session1.artifacts[0]!.content_text).toContain("clap::Parser");
    });

    it("preserves external conversation ID", async () => {
      const data = loadFixture("chatgpt-export.json");
      const raw = await adapter.parseRaw(data, "chatgpt-export.json");
      const result = adapter.normalize(raw, "source-1", "batch-1");

      expect(result.sessions[0]!.session.external_id).toBe("conv-001");
      expect(result.sessions[1]!.session.external_id).toBe("conv-002");
    });

    it("converts unix timestamps to ISO strings", async () => {
      const data = loadFixture("chatgpt-export.json");
      const raw = await adapter.parseRaw(data, "chatgpt-export.json");
      const result = adapter.normalize(raw, "source-1", "batch-1");

      const session = result.sessions[0]!;
      expect(session.session.started_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(session.messages[0]!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("handles conversation with only 2 messages", async () => {
      const data = loadFixture("chatgpt-export.json");
      const raw = await adapter.parseRaw(data, "chatgpt-export.json");
      const result = adapter.normalize(raw, "source-1", "batch-1");

      const session2 = result.sessions[1]!;
      expect(session2.session.title).toBe("Travel planning Japan");
      expect(session2.messages.length).toBe(2);
    });
  });
});
