import { describe, expect, it } from "vitest";
import { mezzanotteItalia, sforaTetto } from "./tetto-giorno";

describe("tetto giornaliero", () => {
  it("mezzanotte italiana con ora legale e solare", () => {
    expect(mezzanotteItalia(new Date("2026-09-19T15:00:00Z"))).toBe("2026-09-18T22:00:00.000Z"); // CEST +2
    expect(mezzanotteItalia(new Date("2026-01-10T15:00:00Z"))).toBe("2026-01-09T23:00:00.000Z"); // CET +1
    expect(mezzanotteItalia(new Date("2026-09-18T23:30:00Z"))).toBe("2026-09-18T22:00:00.000Z"); // gia' il 19 in Italia
  });

  it("sfora solo oltre il tetto; 0 = nessun tetto", () => {
    expect(sforaTetto(250, 50, 300)).toBe(false);
    expect(sforaTetto(260, 50, 300)).toBe(true);
    expect(sforaTetto(9999, 50, 0)).toBe(false);
  });
});

import { sommaSpesa } from "./tetto-giorno";
describe("i conti interni non consumano il tetto dei clienti", () => {
  it("la spesa dei conti interni non si conta", () => {
    const lavori = [
      { buyer_id: "cliente", params: { pricing: { surcharge_cents: 40 } } },
      { buyer_id: "prova", params: { pricing: { surcharge_cents: 250 } } },
      { buyer_id: null, params: { pricing: { surcharge_cents: 10 } } },
    ];
    expect(sommaSpesa(lavori, new Set())).toBe(300);
    expect(sommaSpesa(lavori, new Set(["prova"]))).toBe(50);
  });
});
