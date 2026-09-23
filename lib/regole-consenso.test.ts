import { describe, expect, it } from "vitest";
import { regolePulite, daControllare, decisioneRegole, type PersonaConRegole } from "./regole-consenso";

const claire: PersonaConRegole = { handle: "claire", alias: "Claire", regole: "Niente alcol, niente politica." };
const luca: PersonaConRegole = { handle: "luca", alias: "Luca", regole: null };

describe("il consenso che si legge", () => {
  it("le regole si ripuliscono; vuote = nessuna regola", () => {
    expect(regolePulite("  niente   alcol\n\n e niente politica ")).toBe("niente alcol e niente politica");
    expect(regolePulite("   ")).toBeNull();
    expect(regolePulite(null)).toBeNull();
    expect(regolePulite("x".repeat(900))).toHaveLength(600);
  });

  it("chi non ha regole non passa dal giudice", () => {
    expect(daControllare([claire, luca]).map((p) => p.handle)).toEqual(["claire"]);
    expect(decisioneRegole([luca], null)).toEqual({ via: true, bloccati: [], messaggio: null });
  });

  it("FAIL-CLOSED: se il giudice non risponde e qualcuno ha regole, non si fa", () => {
    const d = decisioneRegole([claire, luca], null);
    expect(d.via).toBe(false);
    expect(d.messaggio).toContain("Claire");
    expect(d.messaggio).toContain("nessun costo");
  });

  it("regola toccata: si blocca e si dice perche', con le parole della persona", () => {
    const d = decisioneRegole([claire, luca], [
      { handle: "claire", consentito: false, regola: "Niente alcol", motivo: "l'aperitivo puo' essere alcolico: chiedi un analcolico." },
    ]);
    expect(d.via).toBe(false);
    expect(d.bloccati).toHaveLength(1);
    expect(d.messaggio).toContain('"Niente alcol"');
    expect(d.messaggio).toContain("analcolico");
  });

  it("scena che rispetta le regole: via libera", () => {
    const d = decisioneRegole([claire], [{ handle: "claire", consentito: true, regola: null, motivo: "ok" }]);
    expect(d).toEqual({ via: true, bloccati: [], messaggio: null });
  });

  it("il giudice dimentica una persona: quella conta come bloccata", () => {
    const altra: PersonaConRegole = { handle: "asia", alias: "Asia", regole: "Niente intimo" };
    const d = decisioneRegole([claire, altra], [{ handle: "claire", consentito: true, regola: null, motivo: "ok" }]);
    expect(d.via).toBe(false);
    expect(d.bloccati.map((b) => b.handle)).toEqual(["asia"]);
  });
});
