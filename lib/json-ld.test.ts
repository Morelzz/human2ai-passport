import { describe, it, expect } from "vitest";
import { jsonLdSicuro } from "./json-ld";

describe("jsonLdSicuro", () => {
  it("un nome non chiude lo script", () => {
    const out = jsonLdSicuro({ name: "Anna</script><script src=//x/y.js></script>" });
    expect(out).not.toMatch(/<\/script/i);
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
  });

  it("il JSON letto resta identico", () => {
    const dati = { name: "Anna & Co <3>", n: 2, a: [" "] };
    expect(JSON.parse(jsonLdSicuro(dati))).toEqual(dati);
  });
});
