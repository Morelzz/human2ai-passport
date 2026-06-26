import { describe, it, expect } from "vitest";
import { joinScene, collectResults, dictationError } from "./dictation";

// ──────────────────────────────────────────────────────────────────────────
// Logica PURA della dettatura vocale (nessun DOM): unione del testo dettato al
// campo, riduzione dei risultati interim/final, messaggi d'errore in italiano.
// La parte Web Speech (hook/bottone) si verifica a terra nel browser.
// ──────────────────────────────────────────────────────────────────────────

describe("joinScene", () => {
  it("usa l'aggiunta quando la base e' vuota", () => {
    expect(joinScene("", "che balla in spiaggia")).toBe("che balla in spiaggia");
  });

  it("unisce con un solo spazio", () => {
    expect(joinScene("che balla", "in spiaggia")).toBe("che balla in spiaggia");
  });

  it("non lascia doppi spazi se la base finisce con spazio", () => {
    expect(joinScene("che balla ", "in spiaggia")).toBe("che balla in spiaggia");
  });

  it("ripulisce gli spazi attorno all'aggiunta", () => {
    expect(joinScene("che balla", "  in spiaggia  ")).toBe("che balla in spiaggia");
  });

  it("lascia invariata la base se l'aggiunta e' vuota o solo spazi", () => {
    expect(joinScene("che balla", "")).toBe("che balla");
    expect(joinScene("che balla", "   ")).toBe("che balla");
  });

  it("non mette spazio prima della punteggiatura", () => {
    expect(joinScene("che balla", ", luce dorata")).toBe("che balla, luce dorata");
    expect(joinScene("ok", ".")).toBe("ok.");
  });
});

describe("collectResults", () => {
  it("separa final e interim e li ripulisce", () => {
    const out = collectResults([
      { transcript: "che balla ", isFinal: true },
      { transcript: "in spiaggia", isFinal: false },
    ]);
    expect(out).toEqual({ final: "che balla", interim: "in spiaggia" });
  });

  it("torna stringhe vuote su lista vuota", () => {
    expect(collectResults([])).toEqual({ final: "", interim: "" });
  });

  it("accumula piu' segmenti interim", () => {
    const out = collectResults([
      { transcript: "lu", isFinal: false },
      { transcript: "ce", isFinal: false },
    ]);
    expect(out).toEqual({ final: "", interim: "luce" });
  });
});

describe("dictationError", () => {
  it("spiega il microfono bloccato", () => {
    expect(dictationError("not-allowed")).toMatch(/[Mm]icrofono/);
    expect(dictationError("service-not-allowed")).toMatch(/[Mm]icrofono/);
  });

  it("non mostra nulla per uno stop volontario", () => {
    expect(dictationError("aborted")).toBe("");
  });

  it("ha un messaggio di ripiego per codici sconosciuti", () => {
    expect(dictationError("qualcosa-di-strano").length).toBeGreaterThan(0);
  });
});
