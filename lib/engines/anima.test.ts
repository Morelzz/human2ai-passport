import { describe, expect, it } from "vitest";
import { corpoPer, costoSeedanceUsd, isDurata, movimentoVietato, prezzoAnima, promptPer } from "./anima";

describe("anima", () => {
  it("Seedance 2.5: formula a token come da /estimate", () => {
    // 480p (854x480) = 0,2056 $ al secondo: il prezzo di listino della loro pagina.
    expect(costoSeedanceUsd(1, 854, 480)).toBeCloseTo(0.206, 2);
    // la prima prova vera: 5 s a 786x1178
    expect(costoSeedanceUsd(5)).toBeCloseTo(2.322, 2);
  });

  it("l'audio resta sempre spento e la risoluzione e' 720p", () => {
    const c = corpoPer("https://x/y.png", "respira", 5);
    expect(c.generate_audio).toBe(false);
    expect(c.resolution).toBe("720p");
    expect(c.duration).toBe(5);
  });

  it("i movimenti pronti diventano prompt in inglese, il testo libero passa con la coda fissa", () => {
    expect(promptPer("respira")).toMatch(/^breathes calmly/);
    expect(promptPer("si sistema la giacca")).toMatch(/^si sistema la giacca\. Photorealistic/);
  });

  it("blocca le richieste vietate", () => {
    expect(movimentoVietato("si spoglia lentamente")).toBe(true);
    expect(movimentoVietato("cammina verso la camera")).toBe(false);
  });

  it("prezzo: costo + ricarico, la persona prende il 45% del ricarico", () => {
    const p = prezzoAnima(5);
    expect(p.gross_cents).toBeGreaterThan(p.cost_cents);
    expect(p.fee_cents + p.royalty_cents).toBe(p.gross_cents);
    expect(prezzoAnima(10).gross_cents).toBeGreaterThan(p.gross_cents);
  });

  it("durate ammesse", () => {
    expect(isDurata(5)).toBe(true);
    expect(isDurata(7)).toBe(false);
  });
});
