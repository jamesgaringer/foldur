import type Database from "@tauri-apps/plugin-sql";
import {
  countProjects,
  countRecommendations,
  createEvidenceLink,
  createRecommendation,
  getMessagesBySession,
  listAllSessions,
  listEvidenceLinksForEntity,
  listProjects,
} from "@foldur/db";

/**
 * Seeds a single onboarding-style recommendation when the library has projects
 * but no recommendation rows yet (so dismiss/accept never causes a duplicate seed).
 */
export async function ensureRecommendationStubUpToDate(
  db: Database,
): Promise<{ created: boolean }> {
  const total = await countRecommendations(db);
  if (total > 0) return { created: false };

  if ((await countProjects(db)) === 0) return { created: false };

  const projects = await listProjects(db);
  const firstProject = projects[0];
  if (!firstProject) return { created: false };

  let sessionId: string;
  let messageId: string | null = null;
  let excerpt: string | null = null;

  const projectEvidence = await listEvidenceLinksForEntity(
    db,
    "project",
    firstProject.id,
  );
  if (projectEvidence.length > 0) {
    const ev = projectEvidence[0]!;
    sessionId = ev.session_id;
    messageId = ev.message_id;
    excerpt = ev.excerpt;
  } else {
    const sessions = await listAllSessions(db);
    const firstSession = sessions[0];
    if (!firstSession) return { created: false };
    sessionId = firstSession.id;
    const messages = await getMessagesBySession(db, sessionId);
    const firstUser = messages.find((m) => m.role === "user");
    messageId = firstUser?.id ?? null;
    excerpt = firstUser ? firstUser.content_text.slice(0, 200) : null;
  }

  const rec = await createRecommendation(db, {
    title: "Review speculative projects",
    rationale:
      "Foldur created speculative projects from your chat titles. Skim the list and archive or refine what still matters.",
    recommendation_type: "next_action",
    priority_score: 0.55,
    actionability_score: 0.7,
    grounding_score: 0.45,
  });

  await createEvidenceLink(db, {
    entity_type: "recommendation",
    entity_id: rec.id,
    session_id: sessionId,
    message_id: messageId,
    artifact_id: null,
    chunk_id: null,
    excerpt,
    explanation:
      "Grounded to your first project (or first session) — stub recommendation for the MVP.",
    evidence_score: 0.45,
  });

  return { created: true };
}
