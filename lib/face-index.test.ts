import { describe, it, expect } from "vitest";
import { faceIndexWithout, type FaceIndex } from "./face-index";

function entry(handle: string, n: number) {
  return { handle, source: `s${n}`, descriptor: Array(128).fill(0.1) };
}

describe("faceIndexWithout (M11: de-index su revoca)", () => {
  const index: FaceIndex = {
    built_at: "2026-06-24T00:00:00.000Z",
    entries: [entry("a", 1), entry("a", 2), entry("b", 1)],
  };

  it("toglie TUTTE le voci dell'handle revocato", () => {
    const { index: next, removed } = faceIndexWithout(index, "a");
    expect(removed).toBe(2);
    expect(next.entries.map((e) => e.handle)).toEqual(["b"]);
  });

  it("handle non presente: niente rimosso, indice invariato", () => {
    const { index: next, removed } = faceIndexWithout(index, "zzz");
    expect(removed).toBe(0);
    expect(next.entries).toHaveLength(3);
  });
});
