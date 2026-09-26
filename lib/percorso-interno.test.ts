import { describe, it, expect } from "vitest";
import { percorsoInterno } from "./percorso-interno";

describe("percorsoInterno", () => {
  it("tiene i percorsi del sito", () => {
    expect(percorsoInterno("/account")).toBe("/account");
    expect(percorsoInterno("/match?avatar=stella#su")).toBe("/match?avatar=stella#su");
    expect(percorsoInterno("/account/verify?didit=done")).toBe("/account/verify?didit=done");
  });

  it("rifiuta tutto quello che porta fuori", () => {
    for (const cattivo of [
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "/\r/evil.example",
      "/ /evil.example",
      "https://evil.example",
      "evil.example",
      "javascript:alert(1)",
      "/%09/evil.example".replace("%09", "\t"),
      "",
    ]) {
      expect(percorsoInterno(cattivo), JSON.stringify(cattivo)).toBeNull();
    }
    expect(percorsoInterno(null)).toBeNull();
    expect(percorsoInterno(42)).toBeNull();
  });

  it("un tab codificato resta testo del percorso, non cambia sito", () => {
    // "%09" arriva gia' decodificato da URLSearchParams; se restasse codificato
    // e' solo un pezzo di percorso sullo stesso sito.
    expect(percorsoInterno("/%09/evil.example")).toBe("/%09/evil.example");
  });
});
