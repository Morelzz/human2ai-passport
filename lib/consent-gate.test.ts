import { describe, it, expect } from "vitest";
import { consentBlockReason } from "./consent-gate";

describe("consentBlockReason (A2: revoca durante un job in volo)", () => {
  const active = { revoked_at: null, commercial_consent: true, protection_only: false };

  it("via libera per un avatar attivo e commerciale", () => {
    expect(consentBlockReason(active)).toBeNull();
  });

  it("blocca se revocato dopo l'enqueue", () => {
    expect(consentBlockReason({ ...active, revoked_at: "2026-06-23" })).toMatch(/revocat/i);
  });

  it("blocca se l'uso commerciale e stato tolto", () => {
    expect(consentBlockReason({ ...active, commercial_consent: false })).toMatch(/commerciale/i);
  });

  it("blocca se diventato sola-protezione", () => {
    expect(consentBlockReason({ ...active, protection_only: true })).toMatch(/protezione/i);
  });

  it("blocca se l'avatar non esiste piu", () => {
    expect(consentBlockReason(null)).toMatch(/non trovato/i);
  });
});
