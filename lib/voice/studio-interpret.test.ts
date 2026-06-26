import { describe, it, expect } from "vitest";
import { interpretToStudio, describeDirection, hasAnyControl } from "./studio-interpret";

// ──────────────────────────────────────────────────────────────────────────
// Regia vocale: la descrizione (parlata o scritta) viene interpretata in
// scelte dello Studio. Qui si testa la parte PURA e di sicurezza: SOLO i token
// validi dei cataloghi passano (mai testo libero come parametro), la scena e'
// ripulita e capata, e l'etichettatura per la conferma all'utente.
// La chiamata all'LLM vive nella route e si verifica a terra.
// ──────────────────────────────────────────────────────────────────────────

describe("interpretToStudio", () => {
  it("tiene i token validi dei cataloghi", () => {
    const out = interpretToStudio({
      scene: "  balla in spiaggia  ",
      framing: "primo_piano",
      light: "golden",
      lens: "35mm",
      expression: "risata",
      pose: "braccia_conserte",
      colorStyle: "bn",
      camera: "analogica",
    });
    expect(out).toEqual({
      scene: "balla in spiaggia",
      pose: "braccia_conserte",
      framing: "primo_piano",
      expression: "risata",
      colorStyle: "bn",
      camera: "analogica",
      lens: "35mm",
      light: "golden",
    });
  });

  it("scarta i token NON in whitelist (niente testo libero come parametro)", () => {
    const out = interpretToStudio({
      framing: "macro",          // inesistente
      lens: "iphone",            // inesistente
      light: "tramonto",         // etichetta libera, non il token "golden"
      pose: "supereroe",         // inesistente
    });
    expect(out.framing).toBeNull();
    expect(out.lens).toBeNull();
    expect(out.light).toBeNull();
    expect(out.pose).toBeNull();
  });

  it("scena assente o vuota torna null, presente viene capata a 500", () => {
    expect(interpretToStudio({}).scene).toBeNull();
    expect(interpretToStudio({ scene: "   " }).scene).toBeNull();
    const long = "a".repeat(800);
    expect(interpretToStudio({ scene: long }).scene?.length).toBe(500);
  });

  it("input non oggetto = tutto null (fail-safe)", () => {
    const out = interpretToStudio("ciao");
    expect(out.scene).toBeNull();
    expect(hasAnyControl(out)).toBe(false);
  });
});

describe("hasAnyControl", () => {
  it("vero se almeno un controllo e' impostato", () => {
    expect(hasAnyControl(interpretToStudio({ lens: "85mm" }))).toBe(true);
  });
  it("falso se nessun controllo (anche con sola scena)", () => {
    expect(hasAnyControl(interpretToStudio({ scene: "in spiaggia" }))).toBe(false);
  });
});

describe("describeDirection", () => {
  it("torna le etichette umane nell'ordine di lettura", () => {
    const d = interpretToStudio({ framing: "primo_piano", light: "golden", lens: "35mm" });
    expect(describeDirection(d)).toEqual(["Primo piano", "35mm", "Golden hour"]);
  });
  it("lista vuota se nessun controllo", () => {
    expect(describeDirection(interpretToStudio({ scene: "x" }))).toEqual([]);
  });
});
