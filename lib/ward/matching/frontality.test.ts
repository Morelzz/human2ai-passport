import { describe, it, expect } from "vitest";
import { frontalityFromLandmarks, type Point } from "./frontality";

// Costruisce 68 landmark sintetici: tutti al centro, poi fissa gli estremi
// mascella (0, 16) e il naso (30) per simulare frontale vs profilo.
function landmarks(noseX: number, leftJawX = 0, rightJawX = 100): Point[] {
  const pts: Point[] = Array.from({ length: 68 }, () => ({ x: 50, y: 50 }));
  pts[0] = { x: leftJawX, y: 50 };
  pts[16] = { x: rightJawX, y: 50 };
  pts[30] = { x: noseX, y: 40 };
  return pts;
}

describe("frontalityFromLandmarks", () => {
  it("frontale: naso centrato tra gli estremi mascella -> ~1", () => {
    expect(frontalityFromLandmarks(landmarks(50))).toBeGreaterThan(0.9);
  });

  it("profilo destro: naso vicino a un estremo -> basso", () => {
    expect(frontalityFromLandmarks(landmarks(92))).toBeLessThan(0.3);
  });

  it("profilo sinistro: naso vicino all'altro estremo -> basso", () => {
    expect(frontalityFromLandmarks(landmarks(8))).toBeLessThan(0.3);
  });

  it("tre quarti: naso spostato ma non all'estremo -> intermedio", () => {
    const f = frontalityFromLandmarks(landmarks(68));
    expect(f).toBeGreaterThan(0.3);
    expect(f).toBeLessThan(0.8);
  });

  it("landmark incompleti (<68) -> 0 (fail-safe: nel dubbio non frontale)", () => {
    expect(frontalityFromLandmarks([{ x: 0, y: 0 }])).toBe(0);
    expect(frontalityFromLandmarks([])).toBe(0);
  });

  it("span mascella degenere -> 0", () => {
    expect(frontalityFromLandmarks(landmarks(50, 50, 50))).toBe(0);
  });

  it("coordinata NaN -> 0 (contratto: nel dubbio non frontale, mai NaN)", () => {
    expect(frontalityFromLandmarks(landmarks(NaN))).toBe(0);
  });

  it("indipendente da scala e traslazione", () => {
    // stesso naso centrato, coordinate spostate e scalate
    const big = frontalityFromLandmarks(landmarks(550, 100, 1000));
    expect(big).toBeGreaterThan(0.9);
  });
});
