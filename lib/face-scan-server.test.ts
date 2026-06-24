import { describe, it, expect } from "vitest";
import { outputScanVerdict } from "./face-scan-server";

// Decisione PURA sull'esito dello scan VETO (CRIT-7): l'unico punto dove si
// decide se consegnare, rigenerare o annullare. Fail-closed sull'indisponibilita'.
describe("outputScanVerdict", () => {
  it("scan non disponibile (scanner giu'): unavailable -> fail-closed, si annulla", () => {
    expect(outputScanVerdict({ available: false, blocked: false })).toBe("unavailable");
  });
  it("volto generato somiglia a un protetto: regenerate", () => {
    expect(outputScanVerdict({ available: true, blocked: true, distance: 0.4, handle: "x" })).toBe("regenerate");
  });
  it("nessun match (o nessun protetto): release", () => {
    expect(outputScanVerdict({ available: true, blocked: false })).toBe("release");
  });
  it("priorita': indisponibile vince anche se blocked e' false", () => {
    // available:false con blocked:false NON deve mai diventare "release".
    expect(outputScanVerdict({ available: false, blocked: false })).not.toBe("release");
  });
});
