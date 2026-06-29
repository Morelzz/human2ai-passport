import { describe, it, expect, afterEach } from "vitest";
import {
  payoutProviderConfigured,
  splitEcho,
  splitRoyalty,
  priceForEcho,
  echoMarkupMultiplier,
  PRICE_CAP_CENTS,
} from "./wallet";

describe("payoutProviderConfigured (A1: fail-closed sul payout)", () => {
  const orig = { ...process.env };
  afterEach(() => {
    process.env = { ...orig };
  });

  it("false senza provider reale: il payout NON deve azzerare le royalty", () => {
    delete process.env.PAYOUT_PROVIDER;
    expect(payoutProviderConfigured()).toBe(false);
  });

  it("true solo con un provider reale configurato", () => {
    process.env.PAYOUT_PROVIDER = "stripe";
    expect(payoutProviderConfigured()).toBe(true);
  });
});

describe("split royalty (invarianti economiche)", () => {
  it("lo split classico somma sempre al lordo", () => {
    const s = splitRoyalty(100);
    expect(s.fee_cents + s.net_cents).toBe(s.gross_cents);
  });

  it("split classico somma sempre al lordo anche su valori dispari", () => {
    const s = splitRoyalty(33);
    expect(s.fee_cents + s.net_cents).toBe(s.gross_cents);
  });
});

describe("ECHO cost-plus (modello 2026-06-29)", () => {
  it("ricarico a scaglioni sul costo OpenAI", () => {
    expect(echoMarkupMultiplier(8)).toBe(3);
    expect(echoMarkupMultiplier(30)).toBe(2);
    expect(echoMarkupMultiplier(80)).toBe(1.5);
  });

  it("prezzo = costo + ricarico, mai sopra il tetto €2 e mai sotto il costo", () => {
    for (const [size, q] of [["1024x1024", "medium"], ["1024x1024", "high"], ["3840x2160", "high"]] as const) {
      const s = splitEcho(null, size, q);
      expect(s.gross_cents).toBe(s.cost_cents + s.markup_cents);
      expect(s.gross_cents).toBeLessThanOrEqual(PRICE_CAP_CENTS);
      expect(s.gross_cents).toBeGreaterThanOrEqual(s.cost_cents); // mai sotto fornitore
      expect(priceForEcho(size, q)).toBe(s.gross_cents);          // display == addebito
    }
  });

  it("split equilibrato: avatar 45% del ricarico, piattaforma il resto, somma al lordo", () => {
    const s = splitEcho(null, "1024x1024", "high");
    expect(s.net_cents).toBe(Math.round(s.markup_cents * 0.45)); // 45% all'avatar
    expect(s.fee_cents + s.net_cents).toBe(s.gross_cents);
    expect(s.fee_cents).toBeGreaterThanOrEqual(s.cost_cents); // piattaforma copre sempre OpenAI
    expect(s.net_cents).toBeLessThanOrEqual(s.markup_cents);
  });

  it("la categoria NON influenza piu' il prezzo (cost-plus puro)", () => {
    const a = splitEcho("Luxury", "1024x1024", "high");
    const b = splitEcho("Food", "1024x1024", "high");
    expect(a.gross_cents).toBe(b.gross_cents);
  });
});
