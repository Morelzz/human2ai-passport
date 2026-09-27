import { describe, expect, it } from "vitest";
import { intervalli, scelteDirettore } from "./direttore";

describe("il direttore", () => {
  const frase = "lei in giubbotto di pelle, parcheggio sotterraneo di notte, luce dura da destra, foto orizzontale a mezzo busto";

  it("tiene solo i valori dei cataloghi e le evidenze che stanno nella frase", () => {
    const s = scelteDirettore(
      { luce: "taglio_destra", formato: "orizzontale", inquadratura: "mezzo_busto", look: "hollywood", posa: "volare", vestiti: { _: "giubbotto di pelle nera" }, evidenze: ["luce dura da destra", "orizzontale", "non c'e'"] },
      frase,
      ["Greta"],
    );
    expect(s.luce).toBe("taglio_destra");
    expect(s.formato).toBe("orizzontale");
    expect(s.inquadratura).toBe("mezzo_busto");
    expect(s.look).toBeNull();
    expect(s.posa).toBeNull();
    expect(s.vestiti).toEqual({ _: "giubbotto di pelle nera" });
    expect(s.evidenze).toEqual(["luce dura da destra", "orizzontale"]);
  });

  it("nel gruppo i vestiti vanno solo ai nomi in scena", () => {
    const s = scelteDirettore({ vestiti: { greta: "abito rosso", Marco: "giacca", _: "boh" } }, "greta in rosso e chiara in nero", ["Greta", "Chiara"]);
    expect(s.vestiti).toEqual({ Greta: "abito rosso" });
  });

  it("gli intervalli da sottolineare non si sovrappongono", () => {
    expect(intervalli("luce dura da destra", ["luce dura", "dura da destra", "destra"])).toEqual([[0, 9], [13, 19]]);
  });

  it("un'uscita rotta non rompe niente", () => {
    const s = scelteDirettore(null, frase, []);
    expect(s).toMatchObject({ luce: null, formato: null, vestiti: {}, evidenze: [] });
  });
});
