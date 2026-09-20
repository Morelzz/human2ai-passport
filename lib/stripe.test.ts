import { describe, expect, it } from "vitest";
import { modalitaStripe, pagamentiAperti } from "./stripe";

describe("pagamenti Stripe", () => {
  it("riconosce chiavi reali, di prova e assenti", () => {
    expect(modalitaStripe("sk_live_abc")).toBe("live");
    expect(modalitaStripe("sk_test_abc")).toBe("test");
    expect(modalitaStripe("rk_test_abc")).toBe("test");
    expect(modalitaStripe(undefined)).toBe("assente");
  });

  it("si incassa solo con chiavi reali", () => {
    expect(pagamentiAperti("live", undefined)).toBe(true);
    expect(pagamentiAperti("test", undefined)).toBe(false);
    expect(pagamentiAperti("assente", "1")).toBe(false);
  });

  it("la leva interna apre le prove", () => {
    expect(pagamentiAperti("test", "1")).toBe(true);
  });
});
