import { describe, it, expect } from "vitest";
import { buildMonitoringConsent } from "./ward-consent";

const NOW = "2026-06-20T00:00:00.000Z";

describe("buildMonitoringConsent", () => {
  it("durata 12m -> expires +12 mesi, scope/on_match passati", () => {
    const r = buildMonitoringConsent({ avatarId: "a1", onMatch: "notify", months: 12, nowIso: NOW });
    expect(r.avatar_id).toBe("a1");
    expect(r.scope).toBe("open_web");
    expect(r.on_match).toBe("notify");
    expect(r.open_web).toBe(true);
    expect(r.granted_at).toBe(NOW);
    expect(r.expires_at).toBe("2027-06-20T00:00:00.000Z");
    expect(r.revoked_at).toBeNull();
  });
  it("durata 6m -> expires +6 mesi", () => {
    expect(buildMonitoringConsent({ avatarId: "a1", onMatch: "auto", months: 6, nowIso: NOW }).expires_at)
      .toBe("2026-12-20T00:00:00.000Z");
  });
  it("on_match invalido -> notify (default sicuro)", () => {
    expect(buildMonitoringConsent({ avatarId: "a1", onMatch: "x" as never, months: 12, nowIso: NOW }).on_match)
      .toBe("notify");
  });
});
