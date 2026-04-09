import { z } from "zod";

export const SourceType = z.enum([
  "chatgpt",
  "claude",
  "cursor",
  "generic",
]);
export type SourceType = z.infer<typeof SourceType>;

export const ImportStatus = z.enum([
  "pending",
  "validating",
  "parsing",
  "normalizing",
  "completed",
  "failed",
]);
export type ImportStatus = z.infer<typeof ImportStatus>;

export const SessionType = z.enum([
  "conversation",
  "coding_session",
  "reasoning_session",
  "artifact_session",
  "unknown",
]);
export type SessionType = z.infer<typeof SessionType>;

export const MessageRole = z.enum([
  "user",
  "assistant",
  "system",
  "tool",
  "unknown",
]);
export type MessageRole = z.infer<typeof MessageRole>;

export const ArtifactType = z.enum([
  "code",
  "markdown",
  "file_patch",
  "plan",
  "design_document",
  "other",
]);
export type ArtifactType = z.infer<typeof ArtifactType>;

export const ChunkType = z.enum([
  "message",
  "artifact",
  "mixed",
]);
export type ChunkType = z.infer<typeof ChunkType>;

export const EntityStatus = z.enum([
  "active",
  "stalled",
  "completed",
  "archived",
  "speculative",
]);
export type EntityStatus = z.infer<typeof EntityStatus>;

export const GoalHorizon = z.enum([
  "short_term",
  "medium_term",
  "long_term",
  "ongoing",
]);
export type GoalHorizon = z.infer<typeof GoalHorizon>;

export const PatternCategory = z.enum([
  "behavioral",
  "cognitive",
  "workflow",
  "temporal",
  "other",
]);
export type PatternCategory = z.infer<typeof PatternCategory>;

export const RecommendationType = z.enum([
  "next_action",
  "revive_stalled",
  "consolidate",
  "revisit_decision",
  "reflect_pattern",
  "extract_plan",
]);
export type RecommendationType = z.infer<typeof RecommendationType>;

export const EntityType = z.enum([
  "project",
  "goal",
  "theme",
  "interest",
  "pattern",
  "recommendation",
]);
export type EntityType = z.infer<typeof EntityType>;

export const PipelineRunStatus = z.enum([
  "running",
  "completed",
  "failed",
]);
export type PipelineRunStatus = z.infer<typeof PipelineRunStatus>;
