import { describe, expect, it } from "vitest";
import { abbina, coerenzaInterna, migliore, sogliaPer, verdetto, DISTANZA_OK, DISTANZA_MAX_SOGLIA, type Riferimento } from "./identity-score";

// Vettori finti a 4 dimensioni: bastano per la geometria delle distanze.
const v = (...x: number[]) => x;
const gab: Riferimento = { chiave: "gabriella", rif: [v(0, 0, 0, 0), v(0.1, 0, 0, 0), v(0, 0.1, 0, 0)], coerenza: 0.12 };
const ste: Riferimento = { chiave: "stella", rif: [v(1, 1, 0, 0), v(1.1, 1, 0, 0)], coerenza: 0.1 };

describe("somiglianza", () => {
  it("abbina ogni volto alla persona piu' vicina, un volto per persona", () => {
    const m = abbina([{ desc: v(1.05, 1, 0, 0), lato: 200 }, { desc: v(0.05, 0, 0, 0), lato: 190 }], [gab, ste]);
    expect(m.persone.find((p) => p.chiave === "gabriella")?.lato).toBe(190);
    expect(m.persone.find((p) => p.chiave === "stella")?.lato).toBe(200);
    expect(m.sconosciuti).toBe(0);
    expect(verdetto(m).ok).toBe(true);
  });

  it("un volto grande che non e' di nessun protagonista e' 'volto sconosciuto'; uno piccolo e' folla", () => {
    const m = abbina([{ desc: v(0, 0, 0, 0), lato: 220 }, { desc: v(5, 5, 5, 5), lato: 120 }, { desc: v(9, 9, 9, 9), lato: 40 }], [gab]);
    expect(m.sconosciuti).toBe(1);
    expect(verdetto(m).motivi).toContain("volto_sconosciuto");
  });

  it("protagonista mancante o lontano", () => {
    expect(verdetto(abbina([], [gab])).motivi).toEqual(["volto_assente"]);
    const lontano = abbina([{ desc: v(0.55, 0, 0, 0), lato: 200 }], [{ ...gab, rif: [v(0, 0, 0, 0)], coerenza: null }]);
    expect(verdetto(lontano).motivi).toEqual(["somiglianza_bassa"]);
  });

  it("la soglia segue la persona ma resta fra i limiti", () => {
    expect(sogliaPer(null)).toBe(DISTANZA_OK);
    expect(sogliaPer(0.3)).toBe(DISTANZA_OK);
    expect(sogliaPer(0.51)).toBe(0.51);
    expect(sogliaPer(0.9)).toBe(DISTANZA_MAX_SOGLIA);
  });

  it("coerenza interna = distanza media fra le foto vere", () => {
    expect(coerenzaInterna([v(0, 0), v(3, 4)])).toBe(5);
    expect(coerenzaInterna([v(0, 0)])).toBeNull();
  });

  it("fra due tentativi vince chi passa, poi chi e' piu' vicino", () => {
    const buono = abbina([{ desc: v(0.05, 0, 0, 0), lato: 200 }], [gab]);
    const scarso = abbina([{ desc: v(0.62, 0, 0, 0), lato: 200 }], [{ ...gab, coerenza: null }]);
    expect(migliore(buono, scarso)).toBe(true);
    expect(migliore(scarso, buono)).toBe(false);
    expect(migliore(buono, null)).toBe(true);
  });
});
