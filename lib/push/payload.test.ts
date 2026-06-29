import { describe, it, expect } from "vitest";
import { buildDetectionPush, buildTestPush } from "./payload";

describe("buildDetectionPush", () => {
  it("usa il singolare per una copia", () => {
    const p = buildDetectionPush(1);
    expect(p.title).toBe("Trovata una copia");
    expect(p.body).toContain("una copia del tuo volto");
    expect(p.url).toBe("/ward");
    expect(p.tag).toBe("ward-detection");
  });

  it("usa il plurale col conteggio per piu' copie", () => {
    const p = buildDetectionPush(3);
    expect(p.title).toBe("Trovate 3 copie");
    expect(p.body).toContain("3 copie del tuo volto");
  });

  it("inserisce l'handle dell'avatar quando fornito, e ne usa il tag", () => {
    const p = buildDetectionPush(2, "mario-r");
    expect(p.body).toContain("di @mario-r");
    expect(p.tag).toBe("ward-detection-mario-r");
  });

  it("normalizza conteggi non validi ad almeno 1", () => {
    expect(buildDetectionPush(0).title).toBe("Trovata una copia");
    expect(buildDetectionPush(-5).title).toBe("Trovata una copia");
    expect(buildDetectionPush(2.9).title).toBe("Trovate 2 copie");
  });

  it("non contiene trattini lunghi nel copy", () => {
    const p = buildDetectionPush(2, "mario-r");
    expect(p.body).not.toMatch(/[–—]/);
    expect(p.title).not.toMatch(/[–—]/);
  });
});

describe("buildTestPush", () => {
  it("conferma l'attivazione e punta a Ward", () => {
    const p = buildTestPush();
    expect(p.title).toBe("Avvisi attivi");
    expect(p.url).toBe("/ward");
    expect(p.body).not.toMatch(/[–—]/);
  });
});
