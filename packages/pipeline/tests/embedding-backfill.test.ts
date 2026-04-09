import type { EmbeddingProvider } from "@foldur/core";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureChunkEmbeddingsUpToDate } from "../src/embedding-backfill.js";

const listBatch = vi.hoisted(() =>
  vi.fn<[], Promise<{ id: string; text: string }[]>>(),
);
const updateVec = vi.hoisted(() =>
  vi.fn<[unknown, string, string], Promise<void>>(),
);

vi.mock("@foldur/db", () => ({
  listChunkTextBatchWithoutEmbedding: listBatch,
  updateChunkEmbeddingVector: updateVec,
}));

const testProvider: EmbeddingProvider = {
  id: "test-2d",
  isLocal: true,
  dimension: 2,
  async embed(texts: string[]) {
    return texts.map((t) => [t.length, 1]);
  },
};

describe("ensureChunkEmbeddingsUpToDate", () => {
  const provider = testProvider;

  beforeEach(() => {
    listBatch.mockReset();
    updateVec.mockReset();
  });

  it("returns zero when no chunks need embeddings", async () => {
    listBatch.mockResolvedValueOnce([]);
    const db = {} as never;
    const r = await ensureChunkEmbeddingsUpToDate(db, provider);
    expect(r.chunksUpdated).toBe(0);
    expect(updateVec).not.toHaveBeenCalled();
  });

  it("embeds and updates in batches until empty", async () => {
    listBatch
      .mockResolvedValueOnce([
        { id: "c1", text: "a" },
        { id: "c2", text: "b" },
      ])
      .mockResolvedValueOnce([]);
    const db = {} as never;
    const r = await ensureChunkEmbeddingsUpToDate(db, provider, {
      batchSize: 80,
    });
    expect(r.chunksUpdated).toBe(2);
    expect(updateVec).toHaveBeenCalledTimes(2);
    expect(updateVec.mock.calls[0]![1]).toBe("c1");
    expect(updateVec.mock.calls[1]![1]).toBe("c2");
    const json0 = updateVec.mock.calls[0]![2];
    expect(JSON.parse(json0).length).toBe(provider.dimension);
  });
});
