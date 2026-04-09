import { describe, it, expect, vi } from "vitest";
import type Database from "@tauri-apps/plugin-sql";
import { listSessionsForTimeline } from "../src/repositories/sessions.js";

describe("listSessionsForTimeline", () => {
  it("parses joined rows with source_type", async () => {
    const row = {
      id: "s1",
      source_id: "src-1",
      import_batch_id: "b1",
      external_id: null,
      title: "Hello",
      started_at: "2026-01-15T12:00:00.000Z",
      ended_at: null,
      session_type: "conversation",
      metadata_json: null,
      created_at: "2026-01-15T12:00:00.000Z",
      updated_at: "2026-01-15T12:00:00.000Z",
      source_type: "chatgpt",
    };
    const select = vi.fn().mockResolvedValue([row]);
    const db = { select } as unknown as Database;
    const list = await listSessionsForTimeline(db);
    expect(list).toHaveLength(1);
    expect(list[0]!.source_type).toBe("chatgpt");
    expect(list[0]!.session.title).toBe("Hello");
  });

  it("builds WHERE and LIMIT placeholders for source + date range + limit", async () => {
    const select = vi.fn().mockResolvedValue([]);
    const db = { select } as unknown as Database;
    await listSessionsForTimeline(db, {
      sourceType: "chatgpt",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      limit: 100,
    });
    expect(select).toHaveBeenCalledOnce();
    const [sql, params] = select.mock.calls[0]!;
    expect(sql).toContain("src.type = $1");
    expect(sql).toContain(
      "date(COALESCE(s.started_at, s.created_at)) >= date($2)",
    );
    expect(sql).toContain(
      "date(COALESCE(s.started_at, s.created_at)) <= date($3)",
    );
    expect(sql).toContain("LIMIT $4");
    expect(params).toEqual(["chatgpt", "2026-01-01", "2026-01-31", 100]);
  });
});
