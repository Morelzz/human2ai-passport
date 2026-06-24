import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { computeTokenHash, truncateToken, consentTokenExpiry, isConsentTokenExpired } from "./token";

describe("computeTokenHash", () => {
  it("è SHA256(id|consent_start), senza categorie", () => {
    const id = "abc-123";
    const start = "2026-06-22";
    const expected = crypto.createHash("sha256").update(`${id}|${start}`).digest("hex");
    expect(computeTokenHash(id, start)).toBe(expected);
  });

  it("token diversi per consent_start diversi (la timeline conta)", () => {
    expect(computeTokenHash("x", "2026-01-01")).not.toBe(computeTokenHash("x", "2026-01-02"));
  });

  it("token diversi per id diversi", () => {
    expect(computeTokenHash("a", "2026-01-01")).not.toBe(computeTokenHash("b", "2026-01-01"));
  });
});

describe("truncateToken", () => {
  it("mostra i primi 16 caratteri con ellissi", () => {
    const h = computeTokenHash("abc-123", "2026-06-22");
    expect(truncateToken(h)).toBe(h.slice(0, 16) + "…");
  });
});

describe("scadenza token di consenso (M12)", () => {
  it("non scaduto se la scadenza e nel futuro", () => {
    const exp = consentTokenExpiry("2026-06-01T00:00:00.000Z");
    expect(isConsentTokenExpired(exp, "2026-06-10T00:00:00.000Z")).toBe(false);
  });
  it("scaduto oltre la finestra di 14 giorni", () => {
    const exp = consentTokenExpiry("2026-06-01T00:00:00.000Z");
    expect(isConsentTokenExpired(exp, "2026-07-01T00:00:00.000Z")).toBe(true);
  });
  it("un token senza scadenza e trattato come da ri-emettere", () => {
    expect(isConsentTokenExpired(null, "2026-06-10T00:00:00.000Z")).toBe(true);
  });
});
