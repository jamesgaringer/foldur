import { describe, it, expect, vi } from "vitest";
import type Database from "@tauri-apps/plugin-sql";
import { createTheme, listThemes } from "../src/repositories/themes.js";

const sampleNew = {
  label: "Testing",
  description: null,
  confidence: 0.5,
  recurrence_score: null,
  first_seen_at: "2026-01-01T00:00:00.000Z",
  last_seen_at: "2026-01-02T00:00:00.000Z",
};

describe("createTheme", () => {
  it("inserts and returns a Theme", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const db = { execute } as unknown as Database;
    const t = await createTheme(db, sampleNew);
    expect(t.label).toBe("Testing");
    expect(t.id).toBeDefined();
  });
});

describe("listThemes", () => {
  it("parses rows", async () => {
    const row = {
      id: "th-1",
      label: "L",
      description: null,
      confidence: 0.5,
      recurrence_score: null,
      first_seen_at: "2026-01-01T00:00:00.000Z",
      last_seen_at: "2026-01-02T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    const select = vi.fn().mockResolvedValue([row]);
    const db = { select } as unknown as Database;
    const list = await listThemes(db);
    expect(list).toHaveLength(1);
    expect(list[0]!.label).toBe("L");
  });
});
