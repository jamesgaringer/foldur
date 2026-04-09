import type { ProjectExtractionCandidate } from "@foldur/core";
import type { DatabasePort } from "./ports.js";

export async function persistSessionExtraction(
  db: DatabasePort,
  candidates: ProjectExtractionCandidate[],
): Promise<void> {
  for (const c of candidates) {
    const project = await db.createProject(c.project);
    for (const ev of c.evidence) {
      await db.createEvidenceLink({
        ...ev,
        entity_type: "project",
        entity_id: project.id,
      });
    }
  }
}
