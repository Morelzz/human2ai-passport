import { describe, expect, it } from "vitest";
import { PIANI, contiPiano, pianoPerId } from "./abbonamenti";

describe("volto a noleggio", () => {
  it("ogni piano copre il costo del motore e lascia margine", () => {
    for (const p of PIANI) {
      const c = contiPiano(p);
      expect(c.costoCents).toBeGreaterThan(0);
      expect(c.costoCents).toBeLessThan(p.prezzoCents / 2); // mai oltre meta' del prezzo
      expect(c.personaCents + c.semblicCents + c.costoCents).toBe(p.prezzoCents);
    }
  });

  it("alla persona va una cifra che si sente, non centesimi", () => {
    const campagna = contiPiano(pianoPerId("campagna")!);
    expect(campagna.personaCents).toBeGreaterThan(3000); // oltre 30 euro al mese
  });

  it("piano sconosciuto: niente", () => {
    expect(pianoPerId("inventato")).toBeUndefined();
  });
});
