import { describe, it, expect, vi } from "vitest";
import type Database from "@tauri-apps/plugin-sql";
import {
  mergeProjectsIntoCanonical,
  recomputeProjectMergeCandidates,
} from "../src/repositories/project-merge.js";

describe("recomputeProjectMergeCandidates", () => {
  it("clears and inserts candidate rows from scored pairs", async () => {
    const projectRow = {
      id: "p1",
      canonical_title: "Alpha",
      description: null,
      status: "active",
      confidence: 0.5,
      momentum_score: null,
      first_seen_at: "2026-01-01T00:00:00.000Z",
      last_seen_at: "2026-01-10T00:00:00.000Z",
      source_span_count: 0,
      next_action_summary: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    const projectRow2 = { ...projectRow, id: "p2", canonical_title: "Alpha" };

    const select = vi
      .fn()
      .mockResolvedValueOnce([projectRow, projectRow2]);
    const execute = vi.fn().mockResolvedValue(undefined);
    const db = { select, execute } as unknown as Database;

    const result = await recomputeProjectMergeCandidates(db);
    expect(result.projectsConsidered).toBe(2);
    expect(result.inserted).toBeGreaterThan(0);

    expect(execute).toHaveBeenCalledWith(
      "DELETE FROM project_merge_candidates",
    );
    const insertCalls = execute.mock.calls.filter((c) =>
      String(c[0]).includes("INSERT INTO project_merge_candidates"),
    );
    expect(insertCalls.length).toBeGreaterThan(0);
  });
});

describe("mergeProjectsIntoCanonical", () => {
  it("throws when survivor equals merged", async () => {
    const db = { select: vi.fn(), execute: vi.fn() } as unknown as Database;
    await expect(
      mergeProjectsIntoCanonical(db, "x", "x"),
    ).rejects.toThrow(/differ/);
  });
});
