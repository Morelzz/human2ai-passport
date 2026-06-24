import { describe, it, expect, afterEach } from "vitest";
import { payoutProviderConfigured, splitEcho, splitRoyalty } from "./wallet";

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

  it("ECHO: il supplemento-compute va tutto alla piattaforma, mai all'avatar", () => {
    const s = splitEcho("Luxury", "1024x1024", "high");
    expect(s.net_cents).toBeLessThanOrEqual(s.value_cents);
    expect(s.gross_cents).toBe(s.value_cents + s.surcharge_cents);
    expect(s.fee_cents + s.net_cents).toBe(s.gross_cents);
  });
});
