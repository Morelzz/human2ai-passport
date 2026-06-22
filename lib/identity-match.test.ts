import { describe, it, expect } from "vitest";
import { classifyIdentityMatch, bandFromDistance } from "./identity-match";
import type { FaceMatchResult } from "./face-match";

// Costruisce un FaceMatchResult dalle distanze date (similarity coerente non
// serve: classifyIdentityMatch ricalcola dalla distanza, fonte unica).
function result(docDist: number | null, selfieDist: number | null): FaceMatchResult {
  return {
    engine: "face-api-client",
    doc_selfie: docDist === null ? null : { distance: docDist, similarity: 0 },
    selfie_photo: selfieDist === null ? null : { distance: selfieDist, similarity: 0, checked: 1 },
    faces_found: { document: docDist !== null, selfie: true, photo: selfieDist !== null },
    computed_at: "2026-06-22T00:00:00.000Z",
  };
}

describe("bandFromDistance", () => {
  it("usa le soglie 0.5 / 0.6 (come il matching Ward)", () => {
    expect(bandFromDistance(0.5)).toBe("strong");
    expect(bandFromDistance(0.6)).toBe("review");
    expect(bandFromDistance(0.61)).toBe("weak");
  });
});

describe("classifyIdentityMatch", () => {
  it("nessun risultato -> inconcludente, score null", () => {
    const v = classifyIdentityMatch(null);
    expect(v.verdict).toBe("inconclusive");
    expect(v.score).toBeNull();
    expect(v.docSelfie).toBeNull();
    expect(v.selfiePhoto).toBeNull();
  });

  it("entrambi i legami forti -> strong, score = legame piu' debole", () => {
    const v = classifyIdentityMatch(result(0.35, 0.4));
    expect(v.verdict).toBe("strong");
    expect(v.docSelfie?.band).toBe("strong");
    expect(v.selfiePhoto?.band).toBe("strong");
    // similarity(0.4) < similarity(0.35): vince il piu' debole
    expect(v.score).toBe(88);
  });

  it("un legame da rivedere -> review (comanda il legame piu' debole)", () => {
    const v = classifyIdentityMatch(result(0.35, 0.55));
    expect(v.verdict).toBe("review");
    expect(v.score).toBe(62);
  });

  it("un legame debole -> weak", () => {
    const v = classifyIdentityMatch(result(0.4, 0.75));
    expect(v.verdict).toBe("weak");
    expect(v.score).toBe(18);
  });

  it("manca un volto su un legame -> inconcludente anche se l'altro e' forte", () => {
    const v = classifyIdentityMatch(result(0.35, null));
    expect(v.verdict).toBe("inconclusive");
    expect(v.score).toBeNull();
    expect(v.docSelfie?.band).toBe("strong");
    expect(v.selfiePhoto).toBeNull();
    expect(v.reasons.some((r) => /selfie e foto/i.test(r))).toBe(true);
  });

  it("distanza non finita trattata come legame assente", () => {
    const v = classifyIdentityMatch(result(Infinity, 0.4));
    expect(v.verdict).toBe("inconclusive");
    expect(v.docSelfie).toBeNull();
  });
});
