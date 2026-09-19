import { describe, expect, it } from "vitest";
import { punteggioVideo, riassumi, verificaVideo, type DipendenzeVerifica } from "./anima-verifica";
import { istantiPer } from "./video-fotogrammi";
import type { MisuraSomiglianza } from "./identity-score";

const misura = (g: number | null, s: number | null, sconosciuti = 0): MisuraSomiglianza => ({
  persone: [
    { chiave: "gabriella", distanza: null, percentuale: g, soglia: 0.5, lato: 200 },
    { chiave: "stella", distanza: null, percentuale: s, soglia: 0.52, lato: 200 },
  ],
  sconosciuti,
  volti: 2,
});

const rif = [{ chiave: "gabriella", rif: [[0]], coerenza: null }, { chiave: "stella", rif: [[1]], coerenza: null }];
const quadri = (n: number) => async () => Array.from({ length: n }, (_, i) => ({ t: i + 0.5, png: Buffer.from(`f${i}`) }));

describe("controllo del video", () => {
  it("un fotogramma a meta' di ogni secondo, piu' uno vicino alla fine", () => {
    expect(istantiPer(5)).toEqual([0.5, 1.5, 2.5, 3.5, 4.5, 4.85]);
    expect(istantiPer(10)).toHaveLength(11);
  });

  it("mediana e minimo per persona, sui fotogrammi dove si vede", () => {
    const r = riassumi([misura(90, 80), misura(94, null), misura(92, 60, 1)], ["gabriella", "stella"]);
    expect(r.persone[0]).toEqual({ chiave: "gabriella", mediana: 92, minimo: 90, visto: 3 });
    expect(r.persone[1]).toEqual({ chiave: "stella", mediana: 70, minimo: 60, visto: 2 });
    expect(r.sconosciuti).toBe(1);
    expect(punteggioVideo(r.persone)).toEqual({ score: 70, minimo: 60 });
  });

  it("un volto protetto in un fotogramma ferma il video", async () => {
    let n = 0;
    const dip: DipendenzeVerifica = { estrai: quadri(6), scan: async () => (++n === 4 ? "regenerate" : "release"), misura: async () => misura(90, 90) };
    const e = await verificaVideo(Buffer.from("v"), 5, rif, ["gabriella", "stella"], dip);
    expect(e.esito).toBe("protetto");
    expect(e.istanteProtetto).toBe(3.5);
  });

  it("se il controllo non si puo' fare il video non esce", async () => {
    const giu: DipendenzeVerifica = { estrai: quadri(6), scan: async () => "unavailable", misura: async () => null };
    expect((await verificaVideo(Buffer.from("v"), 5, rif, ["gabriella"], giu)).esito).toBe("non_disponibile");
    const senza: DipendenzeVerifica = { estrai: async () => [], scan: async () => "release", misura: async () => null };
    expect((await verificaVideo(Buffer.from("v"), 5, rif, ["gabriella"], senza)).esito).toBe("non_disponibile");
    const rotto: DipendenzeVerifica = { estrai: async () => { throw new Error("ffmpeg"); }, scan: async () => "release", misura: async () => null };
    expect((await verificaVideo(Buffer.from("v"), 5, rif, ["gabriella"], rotto)).esito).toBe("non_disponibile");
  });

  it("tutto pulito: esito ok con la somiglianza", async () => {
    const dip: DipendenzeVerifica = { estrai: quadri(3), scan: async () => "release", misura: async () => misura(91, 85) };
    const e = await verificaVideo(Buffer.from("v"), 5, rif, ["gabriella", "stella"], dip);
    expect(e.esito).toBe("ok");
    expect(e.fotogrammi).toBe(3);
    expect(e.persone.map((p) => p.mediana)).toEqual([91, 85]);
  });
});
