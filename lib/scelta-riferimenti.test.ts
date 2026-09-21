import { describe, expect, it } from "vitest";
import { MINIME, scegliRiferimenti } from "./scelta-riferimenti";

// Impronte a una dimensione: la distanza si legge a occhio.
const d = (v: number) => [v];

describe("scelta delle foto vere", () => {
  it("scarta le foto senza volto", () => {
    const s = scegliRiferimenti([d(0), null, d(0.05), d(0.1), d(0.02), null, d(0.08), d(0.04)]);
    expect(s.scartate).toContain(1);
    expect(s.scartate).toContain(5);
    expect(s.tenute).not.toContain(1);
  });

  it("scarta chi e' lontano dal gruppo e migliora la coerenza", () => {
    // sei foto vicine fra loro, due lontanissime
    const s = scegliRiferimenti([d(0), d(0.05), d(0.1), d(0.03), d(0.07), d(0.02), d(3), d(3.2)]);
    expect(s.scartate).toEqual([6, 7]);
    expect(s.coerenzaDopo!).toBeLessThan(s.coerenzaPrima!);
  });

  it("non scende mai sotto il minimo, anche se sono tutte diverse", () => {
    const s = scegliRiferimenti([d(0), d(1), d(2), d(3), d(4)]);
    expect(s.tenute.length).toBeGreaterThanOrEqual(MINIME);
  });

  it("con poche foto le tiene tutte", () => {
    const s = scegliRiferimenti([d(0), d(1), d(2)]);
    expect(s.tenute).toEqual([0, 1, 2]);
    expect(s.scartate).toEqual([]);
  });

  it("se sono tutte coerenti non butta niente", () => {
    const s = scegliRiferimenti([d(0), d(0.02), d(0.04), d(0.01), d(0.03), d(0.05)]);
    expect(s.scartate).toEqual([]);
    expect(s.tenute).toHaveLength(6);
  });
});
