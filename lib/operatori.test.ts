import { describe, expect, it } from "vitest";
import { eOperatore, listaOperatori } from "./operatori";

describe("operatori", () => {
  const lista = listaOperatori(" Morelz@Example.com, altro@example.com ,");

  it("il ruolo admin basta", () => {
    expect(eOperatore("admin", null, new Set())).toBe(true);
  });

  it("un venditore nella lista e' operatore, senza cambiare ruolo", () => {
    expect(eOperatore("seller", "morelz@example.com", lista)).toBe(true);
    expect(eOperatore("seller", "MORELZ@example.com ", lista)).toBe(true);
  });

  it("fuori dalla lista e senza ruolo admin: no", () => {
    expect(eOperatore("seller", "qualcuno@example.com", lista)).toBe(false);
    expect(eOperatore("buyer", null, lista)).toBe(false);
    expect(eOperatore(undefined, "", lista)).toBe(false);
  });

  it("lista vuota o assente: solo il ruolo admin", () => {
    expect(listaOperatori(undefined).size).toBe(0);
    expect(eOperatore("seller", "morelz@example.com", listaOperatori(""))).toBe(false);
  });
});
