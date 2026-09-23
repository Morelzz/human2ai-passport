// lib/adult-gate.test.ts
import { describe, it, expect } from "vitest";
import { adultGateReason } from "./adult-gate";

const NOW = new Date(2026, 5, 24);

describe("adultGateReason", () => {
  it("profilo assente: no_dob", () => {
    expect(adultGateReason(null, NOW)).toBe("no_dob");
  });
  it("account pre-gate (nessuna data, mai verificato): no_dob", () => {
    expect(adultGateReason({ date_of_birth: null, adult_verified_at: null }, NOW)).toBe("no_dob");
  });
  it("il timbro da solo NON basta: senza data si chiede la data (23/9)", () => {
    // prima passava: bastava scriversi adult_verified_at nel profilo
    expect(adultGateReason({ date_of_birth: null, adult_verified_at: "2026-06-23T10:00:00Z" }, NOW)).toBe("no_dob");
  });
  it("il timbro NON scavalca una data da minorenne (la falla del 23/9)", () => {
    expect(adultGateReason({ date_of_birth: "2012-01-01", adult_verified_at: "2026-06-23T10:00:00Z" }, NOW)).toBe("under_18");
  });
  it("autodichiarato adulto: via libera", () => {
    expect(adultGateReason({ date_of_birth: "2000-01-01", adult_verified_at: "2026-06-23T10:00:00Z" }, NOW)).toBeNull();
  });
  it("data presente ma minorenne (difesa): under_18", () => {
    expect(adultGateReason({ date_of_birth: "2012-01-01", adult_verified_at: null }, NOW)).toBe("under_18");
  });
  it("data presente adulta senza esito: via libera", () => {
    expect(adultGateReason({ date_of_birth: "1990-01-01", adult_verified_at: null }, NOW)).toBeNull();
  });
});
