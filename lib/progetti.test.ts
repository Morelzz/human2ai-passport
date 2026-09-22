import { describe, expect, it } from "vitest";
import { testoPulito, nuovoSlug, linkCliente, postiLiberi, riassunto, MAX_NOME, MAX_CONTENUTI } from "./progetti";

describe("cartelle progetto", () => {
  it("il testo dell'utente si ripulisce e si accorcia", () => {
    expect(testoPulito("  Campagna   estate  ", MAX_NOME)).toBe("Campagna estate");
    expect(testoPulito("riga\nriga", MAX_NOME)).toBe("riga riga");
    expect(testoPulito("   ", MAX_NOME)).toBeNull();
    expect(testoPulito(null, MAX_NOME)).toBeNull();
    expect(testoPulito(42, MAX_NOME)).toBeNull();
    expect(testoPulito("x".repeat(200), MAX_NOME)).toHaveLength(MAX_NOME);
  });

  it("l'indirizzo pubblico NON si ricava dal nome e non si indovina", () => {
    const a = nuovoSlug();
    const b = nuovoSlug();
    expect(a).toHaveLength(24);
    expect(a).toMatch(/^[a-z0-9]{24}$/);
    expect(a).not.toBe(b);
    // anche con un generatore povero resta lungo 24
    expect(nuovoSlug(() => "ab")).toHaveLength(24);
  });

  it("il link c'e' solo se il proprietario l'ha acceso", () => {
    expect(linkCliente({ slug: "abc", link_attivo: true }, "https://semblic.com")).toBe("https://semblic.com/p/abc");
    expect(linkCliente({ slug: "abc", link_attivo: true }, "https://semblic.com/")).toBe("https://semblic.com/p/abc");
    expect(linkCliente({ slug: "abc", link_attivo: false }, "https://semblic.com")).toBeNull();
  });

  it("i posti liberi non vanno sotto zero", () => {
    expect(postiLiberi(0)).toBe(MAX_CONTENUTI);
    expect(postiLiberi(MAX_CONTENUTI)).toBe(0);
    expect(postiLiberi(MAX_CONTENUTI + 10)).toBe(0);
  });

  it("il riassunto si legge in italiano", () => {
    expect(riassunto(1, null)).toBe("1 scatto");
    expect(riassunto(3, null)).toBe("3 scatti");
    expect(riassunto(3, "Barilla")).toBe("3 scatti · per Barilla");
  });
});
