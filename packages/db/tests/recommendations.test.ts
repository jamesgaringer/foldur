import { describe, it, expect, vi } from "vitest";
import type Database from "@tauri-apps/plugin-sql";
import {
  createRecommendation,
  listOpenRecommendations,
} from "../src/repositories/recommendations.js";

const sampleNew = {
  title: "Test",
  rationale: "Because",
  recommendation_type: "next_action" as const,
  priority_score: 0.5,
  actionability_score: 0.5,
  grounding_score: 0.5,
};

describe("createRecommendation", () => {
  it("inserts and returns a Recommendation", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const db = { execute } as unknown as Database;
    const r = await createRecommendation(db, sampleNew);
    expect(r.title).toBe("Test");
    expect(r.id).toBeDefined();
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("listOpenRecommendations", () => {
  it("parses rows", async () => {
    const row = {
      id: "rec-1",
      title: "T",
      rationale: "R",
      recommendation_type: "next_action",
      priority_score: 0.5,
      actionability_score: 0.5,
      grounding_score: 0.5,
      created_at: "2026-01-01T00:00:00.000Z",
      dismissed_at: null,
      accepted_at: null,
    };
    const select = vi.fn().mockResolvedValue([row]);
    const db = { select } as unknown as Database;
    const list = await listOpenRecommendations(db);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe("rec-1");
  });
});
