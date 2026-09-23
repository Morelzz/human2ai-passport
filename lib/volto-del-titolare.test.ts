import { describe, it, expect } from "vitest";
import { scegliVolto, handlePulito } from "./volto-del-titolare";

describe("scegliVolto", () => {
  it("nessun volto: null", () => {
    expect(scegliVolto([])).toBeNull();
  });

  it("il caso dell'account demo: random concede, ward-demo protegge, vince random", () => {
    const v = scegliVolto([
      { handle: "ward-demo", protection_only: true, usage_count: 0 },
      { handle: "random", protection_only: false, usage_count: 178 },
    ]);
    expect(v?.handle).toBe("random");
  });

  it("chi concede vince anche se ritirato: cosi' si puo' riattivare", () => {
    const v = scegliVolto([
      { handle: "ward-demo", protection_only: true },
      { handle: "random", protection_only: false, revoked_at: "2026-09-01" },
    ]);
    expect(v?.handle).toBe("random");
  });

  it("tra chi concede: prima chi non si e' ritirato, poi il piu' usato", () => {
    const v = scegliVolto([
      { handle: "a", usage_count: 50, revoked_at: "2026-09-01" },
      { handle: "b", usage_count: 3 },
      { handle: "c", usage_count: 9 },
    ]);
    expect(v?.handle).toBe("c");
  });

  it("soloProtezione prende solo la protezione", () => {
    const v = scegliVolto([
      { handle: "random", protection_only: false, usage_count: 178 },
      { handle: "ward-demo", protection_only: true },
    ], { soloProtezione: true });
    expect(v?.handle).toBe("ward-demo");
  });
});

describe("handlePulito", () => {
  it("accetta un handle e scarta il resto", () => {
    expect(handlePulito(" Random ")).toBe("random");
    expect(handlePulito("luca-agnelli")).toBe("luca-agnelli");
    expect(handlePulito("a,b")).toBeNull();
    expect(handlePulito("x' or 1=1")).toBeNull();
    expect(handlePulito(3)).toBeNull();
    expect(handlePulito("")).toBeNull();
  });
});
