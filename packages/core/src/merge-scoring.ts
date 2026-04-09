import {
  ProjectMergeScoringInputSchema,
  type MergeScoreBreakdown,
  type ProjectMergeCandidatePair,
  type ProjectMergeScoringInput,
} from "./schemas/merge-scoring.js";

/** When title, description, and temporal all apply. */
export const MERGE_SCORE_WEIGHTS_FULL = {
  title: 0.5,
  description: 0.25,
  temporal: 0.25,
} as const;

function normalizeWords(s: string): string[] {
  const norm = s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return norm.split(/\s+/).filter((w) => w.length >= 2);
}

function jaccardSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeWords(a));
  const tb = new Set(normalizeWords(b));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const x of ta) {
    if (tb.has(x)) inter++;
  }
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function parseIsoMs(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return t;
}

/** Interval overlap / union (IoU) for two time spans; invalid order repaired. */
function temporalIoU(a0: string, a1: string, b0: string, b1: string): number {
  let x0 = parseIsoMs(a0);
  let x1 = parseIsoMs(a1);
  let y0 = parseIsoMs(b0);
  let y1 = parseIsoMs(b1);
  if (x1 < x0) [x0, x1] = [x1, x0];
  if (y1 < y0) [y0, y1] = [y1, y0];
  const overlap = Math.max(0, Math.min(x1, y1) - Math.max(x0, y0));
  const union = Math.max(x1, y1) - Math.min(x0, y0);
  if (union <= 0) return 1;
  return overlap / union;
}

function bothDescriptionsPresent(
  a: ProjectMergeScoringInput,
  b: ProjectMergeScoringInput,
): boolean {
  const da = a.description?.trim() ?? "";
  const db = b.description?.trim() ?? "";
  return da.length > 0 && db.length > 0;
}

/**
 * Deterministic 0–1 score for whether two projects might be merged.
 * @throws if `a.id === b.id`
 */
export function scoreProjectMerge(
  a: ProjectMergeScoringInput,
  b: ProjectMergeScoringInput,
): MergeScoreBreakdown {
  if (a.id === b.id) {
    throw new Error("scoreProjectMerge: cannot compare a project to itself");
  }

  const title_similarity = jaccardSimilarity(
    a.canonical_title,
    b.canonical_title,
  );

  const temporal_overlap = temporalIoU(
    a.first_seen_at,
    a.last_seen_at,
    b.first_seen_at,
    b.last_seen_at,
  );

  const useDesc = bothDescriptionsPresent(a, b);
  const description_similarity = useDesc
    ? jaccardSimilarity(a.description!.trim(), b.description!.trim())
    : null;

  let combined: number;
  if (description_similarity === null) {
    const wt = MERGE_SCORE_WEIGHTS_FULL.title;
    const wtr = MERGE_SCORE_WEIGHTS_FULL.temporal;
    const sum = wt + wtr;
    combined =
      (wt / sum) * title_similarity + (wtr / sum) * temporal_overlap;
  } else {
    combined =
      MERGE_SCORE_WEIGHTS_FULL.title * title_similarity +
      MERGE_SCORE_WEIGHTS_FULL.description * description_similarity +
      MERGE_SCORE_WEIGHTS_FULL.temporal * temporal_overlap;
  }

  return {
    title_similarity,
    description_similarity,
    temporal_overlap,
    combined: Math.min(1, Math.max(0, combined)),
  };
}

export interface ListProjectMergeCandidatesOptions {
  /** Minimum `combined` to include (default `0.55`). */
  minCombined?: number;
  /** Max pairs returned after sort (default `500`). */
  maxPairs?: number;
}

/**
 * All unordered pairs with `combined >= minCombined`, sorted by `combined` descending.
 */
export function listProjectMergeCandidates(
  projects: ProjectMergeScoringInput[],
  options?: ListProjectMergeCandidatesOptions,
): ProjectMergeCandidatePair[] {
  const minCombined = options?.minCombined ?? 0.55;
  const maxPairs = options?.maxPairs ?? 500;

  const parsed = projects.map((p) => ProjectMergeScoringInputSchema.parse(p));

  const out: ProjectMergeCandidatePair[] = [];
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i]!;
      const b = parsed[j]!;
      const score = scoreProjectMerge(a, b);
      if (score.combined >= minCombined) {
        const [lo, hi] =
          a.id < b.id ? [a.id, b.id] : [b.id, a.id];
        out.push({
          project_a_id: lo,
          project_b_id: hi,
          score,
        });
      }
    }
  }

  out.sort((x, y) => y.score.combined - x.score.combined);
  return out.slice(0, maxPairs);
}
