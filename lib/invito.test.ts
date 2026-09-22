import { describe, expect, it } from "vitest";
import {
  nuovoCodice, codicePulito, linkInvito, scadenza, ancoraValido, premio, premiDaRicarica,
  PREMIO_INVITANTE_BPS, PREMIO_INVITATO_BPS, TETTO_PREMIO_VOLT,
} from "./invito";

describe("invita un amico", () => {
  it("il codice si detta al telefono: niente I, O, zero e uno", () => {
    for (let i = 0; i < 200; i++) {
      const c = nuovoCodice();
      expect(c).toHaveLength(8);
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    }
  });

  it("il codice incollato si ripulisce", () => {
    expect(codicePulito(" ab-cd 23 ")).toBe("ABCD23");
    expect(codicePulito("abc")).toBeNull(); // troppo corto
    expect(codicePulito(null)).toBeNull();
    expect(codicePulito(123456)).toBeNull();
  });

  it("il link e' pulito con o senza barra finale", () => {
    expect(linkInvito("ABCD2345", "https://semblic.com")).toBe("https://semblic.com/r/ABCD2345");
    expect(linkInvito("ABCD2345", "https://semblic.com/")).toBe("https://semblic.com/r/ABCD2345");
  });

  it("un invito vale dodici mesi", () => {
    const d = scadenza(new Date("2026-09-23T10:00:00Z"));
    expect(d.toISOString().slice(0, 10)).toBe("2027-09-23");
    expect(ancoraValido(d, new Date("2027-09-22T10:00:00Z"))).toBe(true);
    expect(ancoraValido(d, new Date("2027-09-24T10:00:00Z"))).toBe(false);
  });

  it("il premio e' una percentuale, e ha un tetto", () => {
    expect(premio(1000, PREMIO_INVITANTE_BPS)).toBe(200);
    expect(premio(1000, PREMIO_INVITATO_BPS)).toBe(100);
    expect(premio(0, PREMIO_INVITANTE_BPS)).toBe(0);
    expect(premio(-50, PREMIO_INVITANTE_BPS)).toBe(0);
    expect(premio(NaN, PREMIO_INVITANTE_BPS)).toBe(0);
    expect(premio(10_000_000, PREMIO_INVITANTE_BPS)).toBe(TETTO_PREMIO_VOLT);
  });

  it("senza invito non si paga niente", () => {
    expect(premiDaRicarica(1000, null)).toEqual({ invitante: 0, invitato: 0 });
  });

  it("l'invitato prende il suo bonus SOLO la prima volta", () => {
    const inv = { scade_il: "2027-09-23T00:00:00Z", prima_ricarica_fatta: false };
    expect(premiDaRicarica(1000, inv, new Date("2026-10-01"))).toEqual({ invitante: 200, invitato: 100 });
    expect(premiDaRicarica(1000, { ...inv, prima_ricarica_fatta: true }, new Date("2026-10-01")))
      .toEqual({ invitante: 200, invitato: 0 });
  });

  it("scaduto l'invito non si paga piu' nessuno", () => {
    const inv = { scade_il: "2026-09-01T00:00:00Z", prima_ricarica_fatta: false };
    expect(premiDaRicarica(1000, inv, new Date("2026-10-01"))).toEqual({ invitante: 0, invitato: 0 });
  });
});
