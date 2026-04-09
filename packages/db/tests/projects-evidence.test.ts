import { describe, it, expect, vi } from "vitest";
import type Database from "@tauri-apps/plugin-sql";
import type { NewEvidenceLink, NewProject } from "@foldur/core";
import {
  createEvidenceLink,
  hasSessionEvidenceOfType,
  hasSessionProjectEvidence,
  listEvidenceLinksForEntity,
} from "../src/repositories/evidence-links.js";
import { createProject, listProjects } from "../src/repositories/projects.js";

const sampleNewProject: NewProject = {
  canonical_title: "Sample project",
  description: null,
  status: "active",
  confidence: 0.5,
  momentum_score: null,
  first_seen_at: "2026-01-01T00:00:00.000Z",
  last_seen_at: "2026-01-02T00:00:00.000Z",
  source_span_count: 0,
  next_action_summary: null,
};

describe("createProject", () => {
  it("inserts and returns a parsed Project", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const db = { execute } as unknown as Database;
    const p = await createProject(db, sampleNewProject);
    expect(p.canonical_title).toBe("Sample project");
    expect(p.id).toBeDefined();
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("listProjects", () => {
  it("parses rows from select", async () => {
    const row = {
      id: "proj-1",
      canonical_title: "T",
      description: null,
      status: "active",
      confidence: 0.5,
      momentum_score: null,
      first_seen_at: "2026-01-01T00:00:00.000Z",
      last_seen_at: "2026-01-02T00:00:00.000Z",
      source_span_count: 0,
      next_action_summary: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    const select = vi.fn().mockResolvedValue([row]);
    const db = { select } as unknown as Database;
    const list = await listProjects(db);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe("proj-1");
  });
});

const sampleEvidence: NewEvidenceLink = {
  entity_type: "project",
  entity_id: "proj-1",
  session_id: "sess-1",
  message_id: "msg-1",
  artifact_id: null,
  chunk_id: null,
  excerpt: "…",
  explanation: null,
  evidence_score: 0.8,
};

describe("createEvidenceLink", () => {
  it("inserts and returns a parsed EvidenceLink", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const db = { execute } as unknown as Database;
    const e = await createEvidenceLink(db, sampleEvidence);
    expect(e.entity_id).toBe("proj-1");
    expect(e.evidence_score).toBe(0.8);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("hasSessionEvidenceOfType", () => {
  it("returns true for matching entity type", async () => {
    const select = vi.fn().mockResolvedValue([{ cnt: 1 }]);
    const db = { select } as unknown as Database;
    const ok = await hasSessionEvidenceOfType(db, "sess-1", "theme");
    expect(ok).toBe(true);
  });
});

describe("hasSessionProjectEvidence", () => {
  it("returns false when select count is zero", async () => {
    const select = vi.fn().mockResolvedValue([{ cnt: 0 }]);
    const db = { select } as unknown as Database;
    const ok = await hasSessionProjectEvidence(db, "sess-1");
    expect(ok).toBe(false);
  });

  it("returns true when select count is positive", async () => {
    const select = vi.fn().mockResolvedValue([{ cnt: 2 }]);
    const db = { select } as unknown as Database;
    const ok = await hasSessionProjectEvidence(db, "sess-1");
    expect(ok).toBe(true);
  });
});

describe("listEvidenceLinksForEntity", () => {
  it("parses rows from select", async () => {
    const row = {
      id: "ev-1",
      entity_type: "project",
      entity_id: "proj-1",
      session_id: "sess-1",
      message_id: "msg-1",
      artifact_id: null,
      chunk_id: null,
      excerpt: null,
      explanation: null,
      evidence_score: 0.5,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const select = vi.fn().mockResolvedValue([row]);
    const db = { select } as unknown as Database;
    const list = await listEvidenceLinksForEntity(db, "project", "proj-1");
    expect(list).toHaveLength(1);
    expect(list[0]!.session_id).toBe("sess-1");
  });
});
