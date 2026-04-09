import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SEARCH_INDEX_VERSION, createTitleStubExtractionProvider } from "@foldur/core";
import { importFile, importFiles } from "../src/import-orchestrator.js";
import { createMockDb } from "./mock-db.js";

const FIXTURES_DIR = resolve(__dirname, "../../adapters/tests/fixtures");

function loadFixture(name: string): ArrayBuffer {
  const buf = readFileSync(resolve(FIXTURES_DIR, name));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe("importFile", () => {
  it("imports a ChatGPT export end-to-end", async () => {
    const db = createMockDb();
    const data = loadFixture("chatgpt-export.json");

    const result = await importFile(
      { data, fileName: "chatgpt-export.json" },
      db,
    );

    expect(result.status).toBe("completed");
    expect(result.sourceType).toBe("chatgpt");
    expect(result.sessionCount).toBe(2);
    expect(db.state.sources.length).toBe(1);
    expect(db.state.importBatches.length).toBe(1);
    expect(db.state.sessions.length).toBe(2);
    expect(db.state.messages.length).toBe(6);
    expect(db.state.artifacts.length).toBe(2);
    expect(db.state.chunks.length).toBeGreaterThanOrEqual(6);
    expect(db.state.pipelineRuns.length).toBe(1);
    expect(db.state.pipelineRuns[0]!.status).toBe("completed");
    expect(db.state.importBatches[0]!.search_index_version).toBe(
      SEARCH_INDEX_VERSION,
    );
  });

  it("imports a generic JSON file", async () => {
    const db = createMockDb();
    const data = loadFixture("generic-messages.json");

    const result = await importFile(
      { data, fileName: "generic-messages.json" },
      db,
    );

    expect(result.status).toBe("completed");
    expect(result.sourceType).toBe("generic");
    expect(result.sessionCount).toBe(1);
    expect(db.state.messages.length).toBe(4);
  });

  it("imports a markdown conversation", async () => {
    const db = createMockDb();
    const data = loadFixture("generic-markdown.md");

    const result = await importFile(
      { data, fileName: "generic-markdown.md" },
      db,
    );

    expect(result.status).toBe("completed");
    expect(result.sessionCount).toBe(1);
    expect(db.state.messages.length).toBe(4);
  });

  it("detects duplicate imports by file hash", async () => {
    const db = createMockDb();
    const data = loadFixture("chatgpt-export.json");

    await importFile({ data, fileName: "chatgpt-export.json" }, db);
    const secondResult = await importFile(
      { data, fileName: "chatgpt-export.json" },
      db,
    );

    expect(secondResult.sessionCount).toBe(0);
    expect(secondResult.warnings.length).toBe(1);
    expect(secondResult.warnings[0]!.code).toBe("DUPLICATE_IMPORT");
    expect(db.state.sessions.length).toBe(2);
  });

  it("returns failure for unsupported file type", async () => {
    const db = createMockDb();
    const data = new TextEncoder().encode("just text").buffer;

    const result = await importFile(
      { data, fileName: "notes.csv" },
      db,
    );

    expect(result.status).toBe("failed");
    expect(result.error).toContain("No adapter");
  });

  it("calls progress callback at each stage", async () => {
    const db = createMockDb();
    const data = loadFixture("chatgpt-export.json");
    const stages: string[] = [];

    await importFile({ data, fileName: "chatgpt-export.json" }, db, (p) => {
      stages.push(p.stage);
    });

    expect(stages).toContain("detecting");
    expect(stages).toContain("validating");
    expect(stages).toContain("parsing");
    expect(stages).toContain("normalizing");
    expect(stages).toContain("persisting");
    expect(stages).toContain("indexing");
    expect(stages).toContain("completed");
  });

  it("persists title stub extraction when provider is configured", async () => {
    const db = createMockDb();
    const data = loadFixture("chatgpt-export.json");
    const result = await importFile(
      { data, fileName: "chatgpt-export.json" },
      db,
      undefined,
      { extractionProvider: createTitleStubExtractionProvider() },
    );
    expect(result.status).toBe("completed");
    expect(db.state.projects.length).toBe(2);
    expect(db.state.evidenceLinks.length).toBe(2);
    expect(db.state.evidenceLinks[0]!.entity_type).toBe("project");
  });
});

describe("importFiles", () => {
  it("imports multiple files sequentially", async () => {
    const db = createMockDb();

    const results = await importFiles(
      [
        { data: loadFixture("chatgpt-export.json"), fileName: "chatgpt-export.json" },
        { data: loadFixture("generic-messages.json"), fileName: "generic-messages.json" },
      ],
      db,
    );

    expect(results.length).toBe(2);
    expect(results[0]!.status).toBe("completed");
    expect(results[1]!.status).toBe("completed");
    expect(db.state.sessions.length).toBe(3);
  });
});
