import { describe, it, expect } from "vitest";
import { wardGateState } from "./entitlement";

describe("wardGateState", () => {
  it("non loggato -> locked", () => {
    expect(wardGateState({ loggedIn: false, hasAvatar: false, monitoring: "none" })).toBe("locked");
    expect(wardGateState({ loggedIn: false, hasAvatar: true, monitoring: "active" })).toBe("locked");
  });
  it("loggato senza avatar -> locked", () => {
    expect(wardGateState({ loggedIn: true, hasAvatar: false, monitoring: "none" })).toBe("locked");
  });
  it("avatar ma monitoraggio non attivo -> demo", () => {
    for (const m of ["none", "revoked", "expired"] as const)
      expect(wardGateState({ loggedIn: true, hasAvatar: true, monitoring: m })).toBe("demo");
  });
  it("avatar + monitoraggio attivo -> full", () => {
    expect(wardGateState({ loggedIn: true, hasAvatar: true, monitoring: "active" })).toBe("full");
  });
});
