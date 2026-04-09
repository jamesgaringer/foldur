import type { Artifact } from "./schemas/artifact.js";
import type { Message } from "./schemas/message.js";
import type { NewEvidenceLink } from "./schemas/evidence-link.js";
import type { NewProject } from "./schemas/project.js";
import type { Session } from "./schemas/session.js";

/**
 * Evidence rows for a project before the project row exists. The pipeline sets
 * `entity_type` and `entity_id` after `createProject`.
 */
export type NewEvidenceForProject = Omit<
  NewEvidenceLink,
  "entity_type" | "entity_id"
>;

export interface ProjectExtractionCandidate {
  project: NewProject;
  evidence: NewEvidenceForProject[];
}

export interface SessionExtractionInput {
  session: Session;
  messages: Message[];
  artifacts: Artifact[];
}

/**
 * Pluggable session→projects+evidence extraction. Local implementations run
 * on-device; remote implementations require explicit user opt-in (privacy rules).
 */
export interface ExtractionProvider {
  readonly id: string;
  readonly isLocal: boolean;
  extractSession(
    input: SessionExtractionInput,
  ): Promise<ProjectExtractionCandidate[]>;
}

export type IntelligenceTier = "local-heuristic" | "local-model" | "remote-model";

/**
 * Extended provider interface supporting richer intelligence extraction.
 * Tier 1 (local-heuristic): keyword extraction, computed stats — default, no model calls.
 * Tier 2 (local-model): Ollama/llama.cpp for summarization and extraction — optional.
 * Tier 3 (remote-model): OpenAI/Anthropic APIs — optional, requires explicit user opt-in.
 */
export interface IntelligenceProvider extends ExtractionProvider {
  readonly tier: IntelligenceTier;
  readonly requiresNetwork: boolean;
  readonly privacyDisclosure: string;

  summarizeSession?(input: SessionExtractionInput): Promise<string | null>;
  extractTopics?(input: SessionExtractionInput): Promise<string[]>;
  generateDescription?(title: string, sessionTitles: string[]): Promise<string | null>;
}
