import { describe, expect, it } from "vitest";
import { eUnPezzoMancante, possoRicaricare } from "./pezzo-mancante";

describe("pagina scaduta dopo una pubblicazione", () => {
  it("riconosce i modi in cui il browser dice che il pezzo non c'e' piu'", () => {
    const casi = [
      { name: "ChunkLoadError", message: "Loading chunk 964893 failed." },
      { name: "Error", message: "Failed to load chunk /_next/static/chunks/39q.js from module 964893" },
      { name: "TypeError", message: "Failed to fetch dynamically imported module: https://semblic.com/_next/x.js" },
      { name: "TypeError", message: "error loading dynamically imported module" },
      { name: "Error", message: "Importing a module script failed." },
      { name: "TypeError", message: "Expected a JavaScript module script but the server responded with a MIME type of \"text/html\". Strict MIME type checking is enforced" },
      { name: "Error", message: "Loading CSS chunk 12 failed" },
      { name: "Error", message: "Refused to execute script from 'https://semblic.com/_next/static/chunks/39q.js' because its MIME type ('text/plain') is not executable, and strict MIME type checking is enabled." },
    ];
    for (const c of casi) expect(eUnPezzoMancante(c), c.message).toBe(true);
  });

  it("non scambia un errore vero per una pagina scaduta", () => {
    expect(eUnPezzoMancante({ name: "TypeError", message: "Cannot read properties of undefined (reading 'alias')" })).toBe(false);
    expect(eUnPezzoMancante({ name: "Error", message: "generazione fallita: crediti finiti" })).toBe(false);
    expect(eUnPezzoMancante(null)).toBe(false);
    expect(eUnPezzoMancante(undefined)).toBe(false);
    expect(eUnPezzoMancante({})).toBe(false);
  });

  it("ricarica una volta sola: niente carosello", () => {
    const ora = 1_000_000;
    expect(possoRicaricare(ora, null)).toBe(true);
    expect(possoRicaricare(ora, String(ora - 1_000))).toBe(false); // appena ricaricata
    expect(possoRicaricare(ora, String(ora - 31_000))).toBe(true); // passata la finestra
    expect(possoRicaricare(ora, "non-un-numero")).toBe(true);
  });
});
