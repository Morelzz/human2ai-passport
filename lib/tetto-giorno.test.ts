import { describe, expect, it } from "vitest";
import { mezzanotteItalia, sforaTetto } from "./tetto-giorno";

describe("tetto giornaliero", () => {
  it("mezzanotte italiana con ora legale e solare", () => {
    expect(mezzanotteItalia(new Date("2026-09-19T15:00:00Z"))).toBe("2026-09-18T22:00:00.000Z"); // CEST +2
    expect(mezzanotteItalia(new Date("2026-01-10T15:00:00Z"))).toBe("2026-01-09T23:00:00.000Z"); // CET +1
    expect(mezzanotteItalia(new Date("2026-09-18T23:30:00Z"))).toBe("2026-09-18T22:00:00.000Z"); // gia' il 19 in Italia
  });

  it("sfora solo oltre il tetto; 0 = nessun tetto", () => {
    expect(sforaTetto(250, 50, 300)).toBe(false);
    expect(sforaTetto(260, 50, 300)).toBe(true);
    expect(sforaTetto(9999, 50, 0)).toBe(false);
  });
});
