import { describe, it, expect } from "vitest";
import { cosineSimilarity } from "@foldur/core";
import { createHashProjectionEmbeddingProvider } from "../src/hash-projection.js";

describe("createHashProjectionEmbeddingProvider", () => {
  it("returns fixed dimension vectors", async () => {
    const p = createHashProjectionEmbeddingProvider();
    const [a, b] = await p.embed(["hello world", "hello world"]);
    expect(a.length).toBe(p.dimension);
    expect(b.length).toBe(p.dimension);
    expect(a.every((x) => !Number.isNaN(x))).toBe(true);
  });

  it("is deterministic for the same text", async () => {
    const p = createHashProjectionEmbeddingProvider();
    const [a] = await p.embed(["foldur search"]);
    const [b] = await p.embed(["foldur search"]);
    expect(a).toEqual(b);
  });

  it("produces unit-ish norm after L2 normalize", async () => {
    const p = createHashProjectionEmbeddingProvider();
    const [v] = await p.embed(["some longer piece of text for testing norms"]);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("has high cosine for identical strings", async () => {
    const p = createHashProjectionEmbeddingProvider();
    const [a] = await p.embed(["identical"]);
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5);
  });
});
