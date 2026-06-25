import { describe, it, expect } from "vitest";
import { isPublicAvatar } from "./registry";

// isPublicAvatar decide se un avatar e' pubblico/matchabile. Su un prodotto di
// tutela deve essere DEFAULT-DENY: uno status assente/NULL non deve mai significare
// "pubblico". (Tutte le righe oggi sono 'approved', quindi il fix non nasconde nulla
// di esistente, ma blinda il futuro.)
describe("isPublicAvatar (default-deny)", () => {
  const base = { verification_status: "approved", protection_only: false } as never;

  it("approved e non protection_only -> pubblico", () => {
    expect(isPublicAvatar(base)).toBe(true);
  });

  it("protection_only -> mai pubblico", () => {
    expect(isPublicAvatar({ verification_status: "approved", protection_only: true } as never)).toBe(false);
  });

  it("status diverso da approved -> non pubblico", () => {
    expect(isPublicAvatar({ verification_status: "pending_review", protection_only: false } as never)).toBe(false);
  });

  it("status NULL o assente -> NON pubblico (default-deny, non default-open)", () => {
    expect(isPublicAvatar({ verification_status: null, protection_only: false } as never)).toBe(false);
    expect(isPublicAvatar({ protection_only: false } as never)).toBe(false);
  });
});
