import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GenericAdapter } from "../src/generic/generic-adapter.js";

function loadFixture(name: string): ArrayBuffer {
  const path = resolve(__dirname, "fixtures", name);
  const buf = readFileSync(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("GenericAdapter", () => {
  const adapter = new GenericAdapter();

  describe("canParse", () => {
    it("accepts a plain JSON message array", async () => {
      const data = loadFixture("generic-messages.json");
      expect(await adapter.canParse(data, "generic-messages.json")).toBe(true);
    });

    it("accepts a wrapped JSON conversation", async () => {
      const data = loadFixture("generic-wrapped.json");
      expect(await adapter.canParse(data, "generic-wrapped.json")).toBe(true);
    });

    it("accepts a markdown conversation", async () => {
      const data = loadFixture("generic-markdown.md");
      expect(await adapter.canParse(data, "generic-markdown.md")).toBe(true);
    });

    it("rejects a file with no role headers", async () => {
      const data = new TextEncoder().encode("# Just a normal markdown file\nSome text.").buffer;
      expect(await adapter.canParse(data, "readme.md")).toBe(false);
    });
  });

  describe("parseRaw + normalize (JSON array)", () => {
    it("normalizes a flat message array into one session", async () => {
      const data = loadFixture("generic-messages.json");
      const raw = await adapter.parseRaw(data, "generic-messages.json");
      const result = adapter.normalize(raw, "source-1", "batch-1");

      expect(result.sessions.length).toBe(1);
      expect(result.sessions[0]!.messages.length).toBe(4);
      expect(result.sessions[0]!.messages[0]!.role).toBe("user");
      expect(result.sessions[0]!.messages[1]!.role).toBe("assistant");
    });

    it("preserves timestamps from JSON messages", async () => {
      const data = loadFixture("generic-messages.json");
      const raw = await adapter.parseRaw(data, "generic-messages.json");
      const result = adapter.normalize(raw, "source-1", "batch-1");

      expect(result.sessions[0]!.messages[0]!.timestamp).toBe("2024-01-15T10:00:00Z");
    });
  });

  describe("parseRaw + normalize (wrapped JSON)", () => {
    it("normalizes a wrapped conversation with title", async () => {
      const data = loadFixture("generic-wrapped.json");
      const raw = await adapter.parseRaw(data, "generic-wrapped.json");
      const result = adapter.normalize(raw, "source-1", "batch-1");

      expect(result.sessions.length).toBe(1);
      expect(result.sessions[0]!.session.title).toBe("Database design discussion");
      expect(result.sessions[0]!.messages.length).toBe(2);
    });
  });

  describe("parseRaw + normalize (markdown)", () => {
    it("parses markdown with ## User / ## Assistant headers", async () => {
      const data = loadFixture("generic-markdown.md");
      const raw = await adapter.parseRaw(data, "generic-markdown.md");
      const result = adapter.normalize(raw, "source-1", "batch-1");

      expect(result.sessions.length).toBe(1);
      expect(result.sessions[0]!.messages.length).toBe(4);
      expect(result.sessions[0]!.messages[0]!.role).toBe("user");
      expect(result.sessions[0]!.messages[0]!.content_text).toContain("structure my test files");
    });
  });
});
