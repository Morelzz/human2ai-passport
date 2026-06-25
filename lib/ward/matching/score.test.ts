import { describe, it, expect } from "vitest";
import {
  euclideanDistance,
  bestDistance,
  classify,
  DEFAULT_BANDS,
} from "./score";
import { similarityFromDistance } from "../../face-similarity";

describe("euclideanDistance", () => {
  it("calcola la distanza euclidea classica (3-4-5)", () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
  });
  it("e' 0 per vettori identici", () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });
});

describe("bestDistance", () => {
  it("ritorna la distanza minima tra candidato e riferimenti", () => {
    const refs = [
      [0, 0],
      [10, 10],
    ];
    expect(bestDistance(refs, [0, 0])).toBe(0);
    expect(bestDistance(refs, [10, 11])).toBe(1);
  });
  it("ritorna Infinity senza riferimenti", () => {
    expect(bestDistance([], [1, 2])).toBe(Infinity);
  });
});

describe("classify", () => {
  it("confirmed quando la distanza e' bassa (<= 0.5 di default)", () => {
    const c = classify(0.2);
    expect(c.band).toBe("confirmed");
    expect(c.distance).toBe(0.2);
    expect(c.score).toBe(similarityFromDistance(0.2));
    expect(c.score).toBeGreaterThan(50);
  });
  it("review nella fascia intermedia (0.5 < d <= 0.6)", () => {
    expect(classify(0.55).band).toBe("review");
  });
  it("oltre la soglia stessa-persona (0.6) e' discard: i sosia non entrano in review", () => {
    // Verificato a terra (test Luca Agnelli): la fascia 0.6-0.68 ammetteva PERSONE
    // DIVERSE (il suo stesso profilo vs frontale era gia' a 0.62-0.71).
    expect(classify(0.62).band).toBe("discard");
    expect(classify(0.67).band).toBe("discard");
  });
  it("discard sopra la soglia review (0.6)", () => {
    const c = classify(0.75);
    expect(c.band).toBe("discard");
    expect(c.score).toBeLessThan(50);
  });
  it("confine confirmed/review incluso a 0.5", () => {
    expect(classify(0.5).band).toBe("confirmed");
  });
  it("confine review/discard incluso a 0.6", () => {
    expect(classify(0.6).band).toBe("review");
    expect(classify(0.6000001).band).toBe("discard");
  });
  it("Infinity (nessun volto / nessun ref) e' discard con score 0", () => {
    const c = classify(Infinity);
    expect(c.band).toBe("discard");
    expect(c.score).toBe(0);
  });
  it("lo score e' un intero 0-100 (colonna DB integer)", () => {
    const c = classify(0.42);
    expect(Number.isInteger(c.score)).toBe(true);
    expect(c.score).toBeGreaterThanOrEqual(0);
    expect(c.score).toBeLessThanOrEqual(100);
  });
  it("accetta soglie custom", () => {
    const bands = { confirmedMaxDist: 0.3, reviewMaxDist: 0.45 };
    expect(classify(0.4, bands).band).toBe("review");
    expect(classify(0.2, bands).band).toBe("confirmed");
    expect(classify(0.5, bands).band).toBe("discard");
  });
});

describe("DEFAULT_BANDS", () => {
  it("review a 0.6 (soglia stessa-persona FaceNet), confirmed resta stretto a 0.5", () => {
    expect(DEFAULT_BANDS.reviewMaxDist).toBe(0.6);
    expect(DEFAULT_BANDS.confirmedMaxDist).toBe(0.5);
    expect(DEFAULT_BANDS.confirmedMaxDist).toBeLessThan(DEFAULT_BANDS.reviewMaxDist);
  });
});
