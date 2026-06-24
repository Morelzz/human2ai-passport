// lib/age.test.ts
import { describe, it, expect } from "vitest";
import { ageFromDob, isAdult, kycAdultOutcome } from "./age";

// Riferimento temporale fisso: 24 giugno 2026 (ora locale).
const NOW = new Date(2026, 5, 24);

describe("ageFromDob", () => {
  it("compie 18 esattamente oggi: 18", () => {
    expect(ageFromDob("2008-06-24", NOW)).toBe(18);
  });
  it("li compie domani: ancora 17", () => {
    expect(ageFromDob("2008-06-25", NOW)).toBe(17);
  });
  it("li ha compiuti ieri: 18", () => {
    expect(ageFromDob("2008-06-23", NOW)).toBe(18);
  });
  it("nato il 29 febbraio (bisestile): conta gli anni pieni", () => {
    expect(ageFromDob("2000-02-29", NOW)).toBe(26);
  });
  it("data futura: null", () => {
    expect(ageFromDob("2030-01-01", NOW)).toBeNull();
  });
  it("età assurda (> 120): null", () => {
    expect(ageFromDob("1800-01-01", NOW)).toBeNull();
  });
  it("formato non valido: null", () => {
    expect(ageFromDob("non-una-data", NOW)).toBeNull();
  });
  it("data inesistente (30 febbraio): null", () => {
    expect(ageFromDob("2026-02-30", NOW)).toBeNull();
  });
});

describe("isAdult", () => {
  it("18 oggi: adulto", () => expect(isAdult("2008-06-24", NOW)).toBe(true));
  it("17: non adulto", () => expect(isAdult("2008-06-25", NOW)).toBe(false));
  it("formato non valido: non adulto (fail-closed)", () => expect(isAdult("xxx", NOW)).toBe(false));
});

describe("kycAdultOutcome", () => {
  it("dob assente: unknown", () => expect(kycAdultOutcome(null, NOW)).toBe("unknown"));
  it("adulto: ok", () => expect(kycAdultOutcome("2000-01-01", NOW)).toBe("ok"));
  it("minore: under_18", () => expect(kycAdultOutcome("2012-01-01", NOW)).toBe("under_18"));
  it("dob illeggibile: unknown", () => expect(kycAdultOutcome("xxx", NOW)).toBe("unknown"));
});
