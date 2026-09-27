import { describe, expect, it } from "vitest";
import { copertinaDa, FOTO_PAGINE } from "./foto-pagine";

describe("le copertine delle pagine", () => {
  it("si mostrano solo con il consenso vivo di tutti quelli dentro", () => {
    const tutti = new Set(Object.values(FOTO_PAGINE).flatMap((f) => f.persone.map((p) => p.handle)));
    expect(copertinaDa("catalogo", tutti)?.src1600).toBe("/pagine/catalogo-1600.webp");
    const senzaGreta = new Set([...tutti].filter((h) => h !== "greta"));
    expect(copertinaDa("catalogo", senzaGreta)).toBeNull(); // Greta e' nel trio del catalogo
    expect(copertinaDa("prezzi", senzaGreta)).not.toBeNull();
  });

  it("ogni copertina ha il suo certificato intero e i numeri veri", () => {
    for (const f of Object.values(FOTO_PAGINE)) {
      expect(f.certificato).toMatch(/^[0-9a-f]{64}$/);
      expect(f.grossCents).toBeGreaterThan(f.royaltyCents);
      expect(f.persone.length).toBeGreaterThan(0);
    }
  });
});
