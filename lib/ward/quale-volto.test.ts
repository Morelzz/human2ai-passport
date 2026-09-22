import { describe, expect, it } from "vitest";
import { scegliVoltoDaSorvegliare } from "./quale-volto";

describe("quale volto sorveglia Ward", () => {
  it("senza volti non sceglie niente", () => {
    expect(scegliVoltoDaSorvegliare([])).toBeNull();
  });

  it("chi si e' registrato in sola protezione viene prima", () => {
    const l = [
      { id: "registro", protection_only: false },
      { id: "protetto", protection_only: true },
    ];
    expect(scegliVoltoDaSorvegliare(l)?.id).toBe("protetto");
  });

  it("senza volto protetto sorveglia quello del registro (il nuovo caso del 23/9)", () => {
    const l = [{ id: "registro", protection_only: false, revoked_at: null }];
    expect(scegliVoltoDaSorvegliare(l)?.id).toBe("registro");
  });

  it("chi si e' ritirato non viene scelto se c'e' un altro volto vivo", () => {
    const l = [
      { id: "ritirato", protection_only: false, revoked_at: "2026-09-01" },
      { id: "vivo", protection_only: false, revoked_at: null },
    ];
    expect(scegliVoltoDaSorvegliare(l)?.id).toBe("vivo");
  });

  it("se sono tutti ritirati si prende comunque il primo: proteggersi si puo' anche dopo", () => {
    const l = [{ id: "ritirato", protection_only: false, revoked_at: "2026-09-01" }];
    expect(scegliVoltoDaSorvegliare(l)?.id).toBe("ritirato");
  });
});
