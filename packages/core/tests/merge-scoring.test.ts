import { describe, it, expect } from "vitest";
import {
  listProjectMergeCandidates,
  scoreProjectMerge,
} from "../src/merge-scoring.js";
import type { ProjectMergeScoringInput } from "../src/schemas/merge-scoring.js";

function p(
  partial: Partial<ProjectMergeScoringInput> & Pick<ProjectMergeScoringInput, "id">,
): ProjectMergeScoringInput {
  return {
    canonical_title: "Default title",
    description: null,
    first_seen_at: "2026-01-01T00:00:00.000Z",
    last_seen_at: "2026-01-15T00:00:00.000Z",
    ...partial,
  };
}

describe("scoreProjectMerge", () => {
  it("throws when comparing a project to itself", () => {
    const x = p({ id: "same" });
    expect(() => scoreProjectMerge(x, x)).toThrow(/itself/);
  });

  it("scores highly for identical titles and overlapping time", () => {
    const a = p({
      id: "a",
      canonical_title: "Foldur roadmap",
      first_seen_at: "2026-01-01T12:00:00.000Z",
      last_seen_at: "2026-01-10T12:00:00.000Z",
    });
    const b = p({
      id: "b",
      canonical_title: "Foldur roadmap",
      first_seen_at: "2026-01-05T12:00:00.000Z",
      last_seen_at: "2026-01-20T12:00:00.000Z",
    });
    const s = scoreProjectMerge(a, b);
    expect(s.title_similarity).toBe(1);
    expect(s.temporal_overlap).toBeGreaterThan(0);
    expect(s.combined).toBeGreaterThan(0.7);
  });

  it("scores title low when titles share no tokens", () => {
    const a = p({
      id: "a",
      canonical_title: "alpha beta",
      first_seen_at: "2026-01-01T00:00:00.000Z",
      last_seen_at: "2026-01-02T00:00:00.000Z",
    });
    const b = p({
      id: "b",
      canonical_title: "xyz qwerty",
      first_seen_at: "2026-06-01T00:00:00.000Z",
      last_seen_at: "2026-06-02T00:00:00.000Z",
    });
    const s = scoreProjectMerge(a, b);
    expect(s.title_similarity).toBe(0);
    expect(s.temporal_overlap).toBe(0);
    expect(s.combined).toBeLessThan(0.3);
  });

  it("uses description similarity when both sides have text", () => {
    const a = p({
      id: "a",
      canonical_title: "Project A",
      description: "build local search with sqlite fts",
    });
    const b = p({
      id: "b",
      canonical_title: "Other",
      description: "sqlite fts for local search",
    });
    const s = scoreProjectMerge(a, b);
    expect(s.description_similarity).not.toBeNull();
    expect(s.description_similarity!).toBeGreaterThan(0.2);
  });

  it("omits description signal when one side has no description", () => {
    const a = p({
      id: "a",
      canonical_title: "Same",
      description: "only a",
    });
    const b = p({
      id: "b",
      canonical_title: "Same",
      description: null,
    });
    const s = scoreProjectMerge(a, b);
    expect(s.description_similarity).toBeNull();
    expect(s.title_similarity).toBe(1);
  });
});

describe("listProjectMergeCandidates", () => {
  it("returns pairs above threshold sorted by combined descending and respects maxPairs", () => {
    const projects: ProjectMergeScoringInput[] = [
      p({
        id: "1",
        canonical_title: "merge me",
        first_seen_at: "2026-01-01T00:00:00.000Z",
        last_seen_at: "2026-01-02T00:00:00.000Z",
      }),
      p({
        id: "2",
        canonical_title: "merge me",
        first_seen_at: "2026-01-01T12:00:00.000Z",
        last_seen_at: "2026-01-03T00:00:00.000Z",
      }),
      p({
        id: "3",
        canonical_title: "unrelated",
        first_seen_at: "2020-01-01T00:00:00.000Z",
        last_seen_at: "2020-01-02T00:00:00.000Z",
      }),
    ];
    const c = listProjectMergeCandidates(projects, {
      minCombined: 0.4,
      maxPairs: 1,
    });
    expect(c).toHaveLength(1);
    expect(c[0]!.project_a_id < c[0]!.project_b_id).toBe(true);
    const hi = listProjectMergeCandidates(projects, { minCombined: 0.4 });
    expect(hi.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < hi.length; i++) {
      expect(hi[i - 1]!.score.combined).toBeGreaterThanOrEqual(
        hi[i]!.score.combined,
      );
    }
  });
});
