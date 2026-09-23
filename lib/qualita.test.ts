import { describe, expect, it } from "vitest";
import { verdettoQualita, preferisci, qualitaAttiva, costoGiudizioCent, type Giudizio } from "./qualita";

const g = (voto: number, difetti: Giudizio["difetti"] = []): Giudizio => ({ voto, difetti, nota: "" });

describe("il controllo qualita' decide nel codice, non a parole", () => {
  it("una foto buona con note lievi passa", () => {
    expect(verdettoQualita(g(90, [{ tipo: "pelle_impastata", gravita: "lieve", dove: "guance" }])).passa).toBe(true);
  });

  it("un difetto grave basta a scartare (la foto del 21/9: volti clonati)", () => {
    const v = verdettoQualita(g(15, [{ tipo: "volti_clonati", gravita: "grave", dove: "volti" }]));
    expect(v.passa).toBe(false);
    expect(v.motivo).toContain("volti_clonati");
  });

  it("un grave scarta anche se il modello da' un voto alto", () => {
    expect(verdettoQualita(g(95, [{ tipo: "mani", gravita: "grave", dove: "mano destra" }])).passa).toBe(false);
  });

  it("un evidente da solo passa, due evidenti scartano", () => {
    expect(verdettoQualita(g(80, [{ tipo: "occhi", gravita: "evidente", dove: "sx" }])).passa).toBe(true);
    expect(verdettoQualita(g(80, [
      { tipo: "occhi", gravita: "evidente", dove: "sx" },
      { tipo: "denti", gravita: "evidente", dove: "sorriso" },
    ])).passa).toBe(false);
  });

  it("voto troppo basso scarta, voto strano scarta", () => {
    expect(verdettoQualita(g(40)).passa).toBe(false);
    expect(verdettoQualita(g(Number.NaN)).passa).toBe(false);
    expect(verdettoQualita(g(55)).passa).toBe(true);
  });

  it("fra due tentativi vince chi passa; a parita' decide la somiglianza", () => {
    const si = { passa: true, motivo: null };
    const no = { passa: false, motivo: "grave" };
    expect(preferisci(si, no, false)).toBe(true); // passa batte somiglia
    expect(preferisci(no, si, true)).toBe(false);
    expect(preferisci(si, si, true)).toBe(true);
    expect(preferisci(si, si, false)).toBe(false);
  });

  it("giudice non disponibile = conta come passa (fail-open)", () => {
    expect(preferisci(null, { passa: false, motivo: "x" }, false)).toBe(true);
    expect(preferisci(null, null, true)).toBe(true);
  });

  it("si spegne da fuori e il costo si calcola", () => {
    expect(qualitaAttiva({})).toBe(true);
    expect(qualitaAttiva({ QUALITA_CONTROLLO: "0" })).toBe(false);
    // la taratura del 23/9: 2704 in, 135 out -> circa 1,35 centesimi
    expect(costoGiudizioCent(2704, 135)).toBeCloseTo(1.35, 1);
  });
});
