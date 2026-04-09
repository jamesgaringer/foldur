import type Database from "@tauri-apps/plugin-sql";
import {
  listAllSessions,
  getMessagesBySession,
  getSessionProfile,
  getSessionIntelligence,
  getPatternByLabel,
  createPattern,
  updatePattern,
  upsertUserProfile,
  getSessionCount,
  createEvidenceLink,
} from "@foldur/db";
import type { PatternCategory } from "@foldur/core";
import { nowISO } from "@foldur/core";
import { OllamaProvider, OllamaError } from "./ollama-provider.js";

export interface BehavioralProfileResult {
  patternsCreated: number;
  patternsUpdated: number;
  profileUpdated: boolean;
  error?: string;
}

interface SessionDigest {
  id: string;
  title: string;
  started_at: string | null;
  duration_minutes: number | null;
  message_count: number;
  user_msg_count: number;
  assistant_msg_count: number;
  word_count: number;
  top_keywords: string[];
  linked_projects: string[];
  linked_themes: string[];
  first_user_snippet: string;
}

interface LlmTrait {
  label: string;
  description: string;
  category: string;
  confidence: number;
  impact_score: number;
  evidence_session_ids: string[];
}

interface LlmProfileResponse {
  summary: string;
  strengths: string[];
  growth_areas: string[];
  work_style: string;
  traits: LlmTrait[];
}

const VALID_CATEGORIES = new Set<string>([
  "behavioral",
  "cognitive",
  "workflow",
  "temporal",
  "other",
]);

const BATCH_SIZE = 50;

const SYSTEM_PROMPT = `You are a perceptive behavioral analyst examining a person's AI conversation history. Look beneath the surface for patterns that reveal how this person works, thinks, and makes decisions.

You will receive an array of session digests. Each digest includes: the session title, when it happened, duration, message counts, keywords, linked projects/themes, and a snippet of the user's first message.

Analyze these digests and identify deep patterns in:
- Work habits: consistency, focus vs scattered attention, procrastination, task-switching frequency
- Follow-through: starts vs finishes, abandonment patterns, revisiting old work, project completion rate
- Decision-making: analysis paralysis, impulsiveness, measured approach, avoidance
- Financial behavior: if discussed — spending patterns, planning, risk tolerance, financial anxiety
- Learning style: depth vs breadth, theory vs practice, repetition patterns, skill acquisition
- Emotional signals: frustration triggers, motivation cycles, confidence shifts, self-doubt patterns
- Growth trajectory: skills developing, plateaus, areas of stagnation, breakthroughs
- Time patterns: when they work, burst vs steady cadence, late-night patterns, consistency

For each pattern you identify, return an object with:
- "label": a short descriptive name (3-6 words)
- "description": 2-3 sentences with specific evidence from the digests
- "category": one of "behavioral", "cognitive", "workflow", "temporal"
- "confidence": 0.0 to 1.0 (how certain you are)
- "impact_score": 0.0 to 1.0 (how much this affects the person's outcomes)
- "evidence_session_ids": array of session IDs from the digests that support this finding

Also provide:
- "summary": a 2-3 paragraph narrative profile of this person — their working style, strengths, blind spots, and growth trajectory
- "strengths": array of 3-6 short strength labels
- "growth_areas": array of 3-6 short growth-area labels
- "work_style": a one-phrase descriptor (e.g. "Deep-focused builder with scattered follow-through")

Return ONLY valid JSON with this exact structure:
{
  "summary": "...",
  "strengths": ["...", "..."],
  "growth_areas": ["...", "..."],
  "work_style": "...",
  "traits": [{ "label": "...", "description": "...", "category": "...", "confidence": 0.0, "impact_score": 0.0, "evidence_session_ids": ["..."] }]
}`;

export async function runBehavioralProfile(
  db: Database,
  provider: OllamaProvider,
): Promise<BehavioralProfileResult> {
  const result: BehavioralProfileResult = {
    patternsCreated: 0,
    patternsUpdated: 0,
    profileUpdated: false,
  };

  try {
    const digests = await gatherSessionDigests(db);
    if (digests.length === 0) {
      return { ...result, error: "No sessions to analyze" };
    }

    const batches = batchDigests(digests, BATCH_SIZE);
    const allTraits: LlmTrait[] = [];
    let finalProfile: Omit<LlmProfileResponse, "traits"> | null = null;

    for (const batch of batches) {
      const response = await analyzeBatch(provider, batch);
      if (response) {
        allTraits.push(...response.traits);
        finalProfile = {
          summary: response.summary,
          strengths: response.strengths,
          growth_areas: response.growth_areas,
          work_style: response.work_style,
        };
      }
    }

    if (!finalProfile) {
      return { ...result, error: "No profile data returned from model" };
    }

    const merged = mergeTraits(allTraits);

    const validSessionIds = new Set(digests.map((d) => d.id));
    const sessionCount = await getSessionCount(db);

    for (const trait of merged) {
      const category = VALID_CATEGORIES.has(trait.category)
        ? (trait.category as PatternCategory)
        : ("other" as PatternCategory);

      const existing = await getPatternByLabel(db, trait.label);
      if (existing) {
        await updatePattern(db, existing.id, {
          description: trait.description,
          confidence: clamp(trait.confidence, 0, 1),
          impact_score: clamp(trait.impact_score, 0, 1),
          last_seen_at: nowISO(),
        });
        result.patternsUpdated++;

        await linkEvidenceSessions(
          db,
          existing.id,
          trait.evidence_session_ids,
          validSessionIds,
        );
      } else {
        const now = nowISO();
        const pattern = await createPattern(db, {
          label: trait.label,
          description: trait.description,
          category,
          confidence: clamp(trait.confidence, 0, 1),
          impact_score: clamp(trait.impact_score, 0, 1),
          first_seen_at: now,
          last_seen_at: now,
        });
        result.patternsCreated++;

        await linkEvidenceSessions(
          db,
          pattern.id,
          trait.evidence_session_ids,
          validSessionIds,
        );
      }
    }

    await upsertUserProfile(db, {
      summary: finalProfile.summary,
      strengths: finalProfile.strengths ?? [],
      growth_areas: finalProfile.growth_areas ?? [],
      work_style: finalProfile.work_style ?? null,
      model_used: provider.modelName,
      session_count_at_computation: sessionCount,
    });
    result.profileUpdated = true;

    return result;
  } catch (err) {
    if (err instanceof OllamaError) {
      return { ...result, error: `Ollama error (${err.code}): ${err.message}` };
    }
    return {
      ...result,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function gatherSessionDigests(
  db: Database,
): Promise<SessionDigest[]> {
  const sessions = await listAllSessions(db);
  const digests: SessionDigest[] = [];

  for (const session of sessions) {
    const analytics = await getSessionProfile(db, session.id);
    const intelligence = await getSessionIntelligence(db, session.id);

    let firstUserSnippet = "";
    if (analytics && analytics.message_count > 0) {
      const messages = await getMessagesBySession(db, session.id);
      const firstUser = messages.find((m) => m.role === "user");
      if (firstUser?.content_text) {
        firstUserSnippet = firstUser.content_text.slice(0, 150);
      }
    }

    digests.push({
      id: session.id,
      title: session.title ?? "Untitled",
      started_at: session.started_at,
      duration_minutes: analytics?.duration_minutes ?? null,
      message_count: analytics?.message_count ?? 0,
      user_msg_count: analytics?.user_msg_count ?? 0,
      assistant_msg_count: analytics?.assistant_msg_count ?? 0,
      word_count: analytics?.word_count ?? 0,
      top_keywords: analytics?.top_keywords ?? [],
      linked_projects: intelligence
        .filter((i) => i.entity_type === "project")
        .map((i) => i.label),
      linked_themes: intelligence
        .filter((i) => i.entity_type === "theme")
        .map((i) => i.label),
      first_user_snippet: firstUserSnippet,
    });
  }

  digests.sort((a, b) => {
    const da = a.started_at ?? "";
    const db_ = b.started_at ?? "";
    return db_.localeCompare(da);
  });

  return digests;
}

function batchDigests(
  digests: SessionDigest[],
  size: number,
): SessionDigest[][] {
  const batches: SessionDigest[][] = [];
  for (let i = 0; i < digests.length; i += size) {
    batches.push(digests.slice(i, i + size));
  }
  return batches;
}

async function analyzeBatch(
  provider: OllamaProvider,
  batch: SessionDigest[],
): Promise<LlmProfileResponse | null> {
  const compactDigests = batch.map((d) => ({
    id: d.id,
    title: d.title,
    date: d.started_at,
    duration_min: d.duration_minutes,
    msgs: d.message_count,
    user_msgs: d.user_msg_count,
    words: d.word_count,
    keywords: d.top_keywords.slice(0, 8),
    projects: d.linked_projects.slice(0, 5),
    themes: d.linked_themes.slice(0, 5),
    snippet: d.first_user_snippet,
  }));

  const userContent = JSON.stringify(compactDigests, null, 0);

  const raw = await provider.chatCompletion(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Analyze these ${batch.length} session digests:\n${userContent}`,
      },
    ],
    { json: true, timeout: 180_000 },
  );

  return parseProfileResponse(raw);
}

function parseProfileResponse(raw: string): LlmProfileResponse | null {
  try {
    const data = JSON.parse(raw);
    if (typeof data.summary !== "string" || !Array.isArray(data.traits)) {
      console.warn("[Foldur] Ollama response missing required fields");
      return null;
    }

    const traits: LlmTrait[] = (data.traits as unknown[])
      .filter((t): t is Record<string, unknown> => t != null && typeof t === "object")
      .map((t) => ({
        label: String(t.label ?? "Unknown pattern"),
        description: String(t.description ?? ""),
        category: String(t.category ?? "behavioral"),
        confidence: clampNum(t.confidence, 0.3),
        impact_score: clampNum(t.impact_score, 0.3),
        evidence_session_ids: Array.isArray(t.evidence_session_ids)
          ? t.evidence_session_ids.filter((v): v is string => typeof v === "string")
          : [],
      }));

    return {
      summary: data.summary,
      strengths: Array.isArray(data.strengths)
        ? data.strengths.filter((s: unknown): s is string => typeof s === "string")
        : [],
      growth_areas: Array.isArray(data.growth_areas)
        ? data.growth_areas.filter((s: unknown): s is string => typeof s === "string")
        : [],
      work_style: typeof data.work_style === "string" ? data.work_style : "Unknown",
      traits,
    };
  } catch (err) {
    console.warn("[Foldur] Failed to parse Ollama profile response:", err);
    return null;
  }
}

function mergeTraits(traits: LlmTrait[]): LlmTrait[] {
  const byLabel = new Map<string, LlmTrait>();
  for (const t of traits) {
    const key = t.label.toLowerCase().trim();
    const existing = byLabel.get(key);
    if (existing) {
      if (t.confidence > existing.confidence) {
        byLabel.set(key, {
          ...t,
          evidence_session_ids: [
            ...new Set([
              ...existing.evidence_session_ids,
              ...t.evidence_session_ids,
            ]),
          ],
        });
      } else {
        existing.evidence_session_ids = [
          ...new Set([
            ...existing.evidence_session_ids,
            ...t.evidence_session_ids,
          ]),
        ];
      }
    } else {
      byLabel.set(key, { ...t });
    }
  }
  return [...byLabel.values()];
}

async function linkEvidenceSessions(
  db: Database,
  patternId: string,
  sessionIds: string[],
  validSessionIds: Set<string>,
): Promise<void> {
  const unique = [...new Set(sessionIds)].filter((id) =>
    validSessionIds.has(id),
  );
  for (const sessionId of unique.slice(0, 10)) {
    try {
      await createEvidenceLink(db, {
        entity_type: "pattern",
        entity_id: patternId,
        session_id: sessionId,
        message_id: null,
        artifact_id: null,
        chunk_id: null,
        excerpt: null,
        explanation: "Behavioral pattern evidence",
        evidence_score: 0.7,
      });
    } catch {
      // duplicate or FK violation — safe to skip
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampNum(value: unknown, fallback: number): number {
  if (typeof value === "number" && isFinite(value)) {
    return clamp(value, 0, 1);
  }
  return fallback;
}
