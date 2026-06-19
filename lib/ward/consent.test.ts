import { describe, it, expect } from "vitest";
import { monitoringConsentStatus, type MonitoringConsentRow } from "./consent";

const NOW = "2026-06-19T12:00:00.000Z";
const base: MonitoringConsentRow = {
  scope: "open_web", on_match: "notify", open_web: true,
  granted_at: "2026-06-01T00:00:00.000Z", expires_at: null, revoked_at: null,
};

describe("monitoringConsentStatus", () => {
  it("null o senza granted_at -> none", () => {
    expect(monitoringConsentStatus(null, NOW)).toBe("none");
    expect(monitoringConsentStatus({ ...base, granted_at: null }, NOW)).toBe("none");
  });
  it("revocato -> revoked (anche se non scaduto)", () => {
    expect(monitoringConsentStatus({ ...base, revoked_at: "2026-06-10T00:00:00.000Z" }, NOW)).toBe("revoked");
  });
  it("scaduto -> expired", () => {
    expect(monitoringConsentStatus({ ...base, expires_at: "2026-06-18T00:00:00.000Z" }, NOW)).toBe("expired");
  });
  it("scadenza esattamente ora -> expired (confine incluso)", () => {
    expect(monitoringConsentStatus({ ...base, expires_at: NOW }, NOW)).toBe("expired");
  });
  it("attivo senza scadenza -> active", () => {
    expect(monitoringConsentStatus(base, NOW)).toBe("active");
  });
  it("attivo con scadenza futura -> active", () => {
    expect(monitoringConsentStatus({ ...base, expires_at: "2026-12-31T00:00:00.000Z" }, NOW)).toBe("active");
  });
  it("revoca ha priorita' sulla scadenza", () => {
    expect(monitoringConsentStatus({ ...base, expires_at: "2099-01-01T00:00:00.000Z", revoked_at: "2026-06-05T00:00:00.000Z" }, NOW)).toBe("revoked");
  });
});
