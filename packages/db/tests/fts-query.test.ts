import { describe, it, expect } from "vitest";
import { ftsMatchQueryFromUserInput } from "../src/repositories/search.js";

describe("ftsMatchQueryFromUserInput", () => {
  it("returns null for empty input", () => {
    expect(ftsMatchQueryFromUserInput("")).toBeNull();
    expect(ftsMatchQueryFromUserInput("   ")).toBeNull();
  });

  it("quotes tokens and joins with AND", () => {
    expect(ftsMatchQueryFromUserInput("hello world")).toBe('"hello" AND "world"');
  });

  it("escapes double quotes inside a token", () => {
    expect(ftsMatchQueryFromUserInput('a"b')).toBe('"a""b"');
  });
});
