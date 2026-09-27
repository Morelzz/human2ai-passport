import { describe, expect, it } from "vitest";
import { MODELLO_112, allinea, cinquePunti, coseno, distanzaDaCoseno, impronta, normalizza, similitudine } from "./arcface";

describe("il misuratore serio (SFace)", () => {
  it("la similitudine ritrova scala, rotazione e spostamento", () => {
    const ang = 0.3, sc = 2.5;
    const src: [number, number][] = MODELLO_112.map(([x, y]) => [(Math.cos(ang) * x - Math.sin(ang) * y) / sc + 40, (Math.sin(ang) * x + Math.cos(ang) * y) / sc - 7]);
    const { a, b, tx, ty } = similitudine(src, MODELLO_112);
    for (let i = 0; i < 5; i++) {
      const [x, y] = src[i];
      expect(a * x - b * y + tx).toBeCloseTo(MODELLO_112[i][0], 4);
      expect(b * x + a * y + ty).toBeCloseTo(MODELLO_112[i][1], 4);
    }
  });

  it("allinea un'immagine gia' al modello e la copia uguale", () => {
    const w = 112, h = 112, rgb = new Uint8Array(w * h * 3);
    for (let i = 0; i < rgb.length; i++) rgb[i] = (i * 7) % 251;
    const out = allinea(rgb, w, h, MODELLO_112);
    expect(out.length).toBe(3 * 112 * 112);
    expect(out[0 * 112 * 112 + 50 * 112 + 60]).toBeCloseTo(rgb[(50 * 112 + 60) * 3 + 0], 3);
  });

  it("i cinque punti vengono dai 68 di face-api", () => {
    const p = Array.from({ length: 68 }, (_, i) => ({ x: i, y: i * 2 }));
    const c = cinquePunti(p);
    expect(c[0]).toEqual([38.5, 77]); // media 36-41
    expect(c[2]).toEqual([30, 60]);
    expect(c[4]).toEqual([54, 108]);
  });

  it("la scala: 0,65 di coseno e' la soglia 0,5, le foto vere stanno sotto, le sconosciute sopra", () => {
    expect(distanzaDaCoseno(0.65)).toBeCloseTo(0.5, 6);
    expect(distanzaDaCoseno(0.685)).toBeLessThan(0.5); // la vera piu' bassa del banco
    expect(distanzaDaCoseno(0.599)).toBeGreaterThan(0.5); // la sconosciuta piu' alta
    expect(distanzaDaCoseno(1)).toBe(0);
  });

  it("impronta e coseno", () => {
    const a = normalizza([1, 0, 0]), b = normalizza([0.9, 0.1, 0]);
    expect(coseno(a, a)).toBeCloseTo(1, 6);
    const m = impronta([a, b])!;
    expect(coseno(m, m)).toBeCloseTo(1, 6);
    expect(impronta([])).toBeNull();
  });
});
