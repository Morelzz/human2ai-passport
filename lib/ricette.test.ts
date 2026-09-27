import { describe, expect, it } from "vitest";
import { nomeProposto, ricettaPulita } from "./ricette";

describe("le ricette", () => {
  it("tiene solo valori dei cataloghi e toglie la persona", () => {
    const r = ricettaPulita({
      nome: "  Noir\nin garage ", scena: "parcheggio sotterraneo di notte", luce: "taglio_destra", look: "hollywood",
      formato: "orizzontale", qualita: "massima", posa: "volare", vestiti: ["giubbotto di pelle", "", ""], certificate: "abc123def456", handle: "gabriella",
    });
    expect(r).toMatchObject({ nome: "Noir in garage", luce: "taglio_destra", look: "naturale", formato: "orizzontale", qualita: "massima", posa: null, vestiti: ["giubbotto di pelle"], certificate: "abc123def456" });
    expect(r).not.toHaveProperty("handle");
  });

  it("senza nome o scena non si salva", () => {
    expect(ricettaPulita({ nome: "", scena: "una scena" })).toBeNull();
    expect(ricettaPulita({ nome: "x", scena: "  " })).toBeNull();
    expect(ricettaPulita(null)).toBeNull();
  });

  it("un certificato strano non passa", () => {
    expect(ricettaPulita({ nome: "a", scena: "abc", certificate: "../../etc" })?.certificate).toBeNull();
  });

  it("propone un nome dalla scena", () => {
    expect(nomeProposto("cammina in centro al tramonto, luce calda")).toBe("Cammina in centro al tramonto");
    expect(nomeProposto("seduta al bancone di un")).toBe("Seduta al bancone");
    expect(nomeProposto("")).toBe("La mia ricetta");
  });
});
