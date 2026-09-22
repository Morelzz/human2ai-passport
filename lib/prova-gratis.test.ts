import { describe, expect, it } from "vitest";
import { SCENE, scenaProva, provaAttiva, tettoProveGiorno, accountProva, voltiPerLaProva, MISURA_PROVA, QUALITA_PROVA } from "./prova-gratis";
import { splitEcho } from "./wallet";

describe("prova gratis", () => {
  it("l'interruttore e' SPENTO se nessuno lo accende", () => {
    expect(provaAttiva({})).toBe(false);
    expect(provaAttiva({ PROVA_GRATIS: "0" })).toBe(false);
    expect(provaAttiva({ PROVA_GRATIS: "true" })).toBe(false); // solo "1", niente interpretazioni
    expect(provaAttiva({ PROVA_GRATIS: "1" })).toBe(true);
  });

  it("le scene sono una lista chiusa: niente testo libero", () => {
    expect(SCENE).toHaveLength(6);
    expect(scenaProva("moda")?.l).toBe("In un set di moda");
    expect(scenaProva("una ragazza che fa qualcosa di strano")).toBeNull();
    expect(scenaProva(null)).toBeNull();
    expect(scenaProva({ prompt: "x" })).toBeNull();
    for (const s of SCENE) expect(s.prompt.length).toBeGreaterThan(20);
  });

  it("il tetto giornaliero ha un default sensato e si cambia da fuori", () => {
    expect(tettoProveGiorno({})).toBe(200);
    expect(tettoProveGiorno({ PROVA_TETTO_GIORNO: "50" })).toBe(50);
    expect(tettoProveGiorno({ PROVA_TETTO_GIORNO: "0" })).toBe(200); // zero non spegne per sbaglio: per spegnere c'e' l'interruttore
    expect(tettoProveGiorno({ PROVA_TETTO_GIORNO: "boh" })).toBe(200);
  });

  it("l'account di servizio ha un nome suo", () => {
    expect(accountProva({})).toBe("prova@semblic.app");
    expect(accountProva({ PROVA_ACCOUNT: "altro@x.it" })).toBe("altro@x.it");
  });

  it("in vetrina vanno solo i volti liberi, i piu' usati per primi", () => {
    const righe = [
      { handle: "a", alias: "A", usage_count: 3 },
      { handle: "b", alias: "B", usage_count: 20 },
      { handle: "c", alias: "C", usage_count: 99, revoked_at: "2026-09-01" },
      { handle: "d", alias: "D", usage_count: 50, commercial_consent: false },
      { handle: "e", alias: "E", usage_count: 10 },
    ];
    expect(voltiPerLaProva(righe).map((x) => x.handle)).toEqual(["b", "e", "a"]);
    expect(voltiPerLaProva(righe, 2).map((x) => x.handle)).toEqual(["b", "e"]);
  });

  it("una prova costa 13 centesimi veri, e la ricevuta torna", () => {
    const s = splitEcho(null, MISURA_PROVA, QUALITA_PROVA);
    // Fuori di tasca escono il motore (OpenAI) e la quota della persona: la
    // commissione la paghiamo a noi stessi, non e' una spesa.
    expect(s.cost_cents + s.net_cents).toBe(13);
    expect(s.fee_cents + s.net_cents).toBe(s.gross_cents);
  });
});
