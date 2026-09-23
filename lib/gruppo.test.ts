import { describe, expect, it } from "vitest";
import { descrizioneBreve, dividiRoyalty, eseguiGruppo, fotoPerPersona, prezzoGruppo, promptPassaggio, promptScena, type Protagonista } from "./gruppo";
import type { Riferimento } from "./identity-score";

const foto = (n: number) => Array.from({ length: n }, (_, i) => Buffer.from(`f${i}`));
const p = (alias: string): Protagonista => ({ avatarId: alias, handle: alias, alias, identityText: `${alias} identity`, foto: foto(8) });

// due persone con descrittori a una dimensione: la distanza si legge a occhio
const RIF: Riferimento[] = [
  { chiave: "a", rif: [[0], [0]], coerenza: null },
  { chiave: "b", rif: [[10], [10]], coerenza: null },
];

describe("scene di gruppo", () => {
  it("foto per persona entro il limite di 10 immagini", () => {
    expect(fotoPerPersona(2)).toBe(4);
    expect(fotoPerPersona(3)).toBe(3);
    expect(fotoPerPersona(4)).toBe(2);
  });

  it("il prompt della scena dichiara l'ordine e le immagini di ognuno", () => {
    const t = promptScena("al bar", [p("gabriella"), p("stella")]);
    expect(t).toContain("exactly 2 people");
    expect(t).toContain("Person 1 (first from the LEFT) is exactly the person in reference images 1-4, gabriella identity");
    expect(t).toContain("Person 2 (second from the LEFT) is exactly the person in reference images 5-8");
    expect(promptPassaggio(1, 3)).toContain("second from the LEFT");
  });

  it("l'identikit entra nel prompt in forma breve", () => {
    expect(descrizioneBreve("The person is an Italian woman, apparent age 18-25, slim build. Their natural hair is blonde.")).toBe("an Italian woman, apparent age 18-25, slim build, natural hair blonde");
    expect(descrizioneBreve(null)).toBeNull();
  });

  it("prezzo: una scena di gruppo vale due scatti, la parte delle persone divisa", () => {
    const g = prezzoGruppo({ gross_cents: 24, fee_cents: 20, net_cents: 4, surcharge_cents: 11 }, 2);
    expect(g.gross_cents).toBe(48);
    expect(g.royalty_cents).toBe(8);
    expect(g.fee_cents + g.royalty_cents).toBe(48);
    expect(g.surcharge_cents).toBe(22);
    expect(g.quote).toEqual([4, 4]);
    // stesso prezzo con quattro persone: il motore fa sempre una scena sola
    expect(prezzoGruppo({ gross_cents: 24, fee_cents: 20, net_cents: 4, surcharge_cents: 11 }, 4).gross_cents).toBe(48);
  });

  it("royalty in parti uguali, il resto al primo", () => {
    expect(dividiRoyalty(10, 3)).toEqual([4, 3, 3]);
    expect(dividiRoyalty(9, 3).reduce((a, b) => a + b, 0)).toBe(9);
  });

  it("se i volti tornano si consegna la scena e basta: nessun ritocco", async () => {
    const chiamate: { prompt: string; n: number; primo: string }[] = [];
    const genera = async (prompt: string, imm: Buffer[]) => {
      chiamate.push({ prompt, n: imm.length, primo: imm[0].toString() });
      return { png: Buffer.from(`uscita${chiamate.length}`), costoCent: 7 };
    };
    const volti = async () => [{ x: 100, lato: 150, desc: [0.2] }, { x: 400, lato: 150, desc: [10.1] }];
    const r = await eseguiGruppo({ scena: "al bar", persone: [p("a"), p("b")], riferimenti: RIF, genera, volti });
    expect(chiamate).toHaveLength(1);
    expect(chiamate[0].n).toBe(8); // 4 foto a testa
    expect(r.passaggi).toBe(1);
    expect(r.ripassato).toBeNull();
    expect(r.costoCent).toBe(7);
  });

  it("se nella scena mancano volti la rifa' una volta", async () => {
    let n = 0;
    const genera = async () => ({ png: Buffer.from(`u${++n}`), costoCent: 5 });
    let visti = 0;
    const volti = async () => (visti++ === 0 ? [{ x: 1, lato: 150, desc: [0] }] : [{ x: 1, lato: 150, desc: [0] }, { x: 2, lato: 150, desc: [1] }]);
    const r = await eseguiGruppo({ scena: "x", persone: [p("a"), p("b")], riferimenti: [], genera, volti });
    expect(n).toBe(2); // due scene, nessun passaggio: senza riferimenti non si misura
    expect(r.volti).toBe(2);
  });

  it("ritocca solo chi non viene riconosciuto e tiene la versione migliore", async () => {
    const chiamate: { prompt: string; n: number; primo: string }[] = [];
    const genera = async (prompt: string, imm: Buffer[]) => {
      chiamate.push({ prompt, n: imm.length, primo: imm[0].toString() });
      return { png: Buffer.from(`u${chiamate.length}`), costoCent: 5 };
    };
    const volti = async (png: Buffer) => {
      // nella scena "b" e' lontana (0,7); nel ritocco torna vicina (0,3)
      const b = png.toString() === "u2" ? 10.3 : 10.7;
      return [{ x: 1, lato: 150, desc: [0.2] }, { x: 2, lato: 150, desc: [b] }];
    };
    const r = await eseguiGruppo({ scena: "x", persone: [p("a"), p("b")], riferimenti: RIF, genera, volti });
    expect(chiamate).toHaveLength(2); // la scena e UN solo ritocco, quello di "b"
    expect(chiamate[1].prompt).toContain("second from the LEFT");
    expect(chiamate[1].primo).toBe("u1"); // il ritocco parte dalla scena
    expect(chiamate[1].n).toBe(9); // la scena + le 8 foto vere di "b"
    expect(r.passaggi).toBe(2);
    expect(r.ripassato).toBe("b");
    expect(r.png.toString()).toBe("u2");
    expect(r.misura?.persone.find((x) => x.chiave === "b")?.distanza).toBeCloseTo(0.3, 5);
  });

  it("un ritocco che peggiora si butta: resta la scena", async () => {
    let n = 0;
    const genera = async () => ({ png: Buffer.from(`u${++n}`), costoCent: 5 });
    const volti = async () => [{ x: 1, lato: 150, desc: [0.2] }, { x: 2, lato: 150, desc: [10.7] }];
    const r = await eseguiGruppo({ scena: "x", persone: [p("a"), p("b")], riferimenti: RIF, genera, volti });
    expect(n).toBe(2); // provato una volta, poi si smette
    expect(r.png.toString()).toBe("u1");
    expect(r.ripassato).toBeNull();
  });

  it("scena con tutti i volti ma che NON passa il controllo qualita': si rifa' e si consegna la buona", async () => {
    let n = 0;
    const genera = async () => ({ png: Buffer.from(`u${++n}`), costoCent: 5 });
    const volti = async () => [{ x: 1, lato: 150, desc: [0.2] }, { x: 2, lato: 150, desc: [10.1] }];
    const giudica = async (png: Buffer) =>
      png.toString() === "u1" ? { passa: false, motivo: "grave: volti_clonati" } : { passa: true, motivo: null };
    const r = await eseguiGruppo({ scena: "x", persone: [p("a"), p("b")], riferimenti: RIF, genera, volti, giudica });
    expect(n).toBe(2);
    expect(r.png.toString()).toBe("u2");
    expect(r.qualita?.passa).toBe(true);
  });

  it("scena buona al primo colpo: niente secondo tentativo", async () => {
    let n = 0;
    const genera = async () => ({ png: Buffer.from(`u${++n}`), costoCent: 5 });
    const volti = async () => [{ x: 1, lato: 150, desc: [0.2] }, { x: 2, lato: 150, desc: [10.1] }];
    const r = await eseguiGruppo({ scena: "x", persone: [p("a"), p("b")], riferimenti: RIF, genera, volti, giudica: async () => ({ passa: true, motivo: null }) });
    expect(n).toBe(1);
    expect(r.qualita?.passa).toBe(true);
  });

  it("un ritocco che fa somigliare di piu' ma rompe la foto non si tiene", async () => {
    let n = 0;
    const genera = async () => ({ png: Buffer.from(`u${++n}`), costoCent: 5 });
    const volti = async (png: Buffer) => [{ x: 1, lato: 150, desc: [0.2] }, { x: 2, lato: 150, desc: [png.toString() === "u2" ? 10.3 : 10.7] }];
    const giudica = async (png: Buffer) =>
      png.toString() === "u2" ? { passa: false, motivo: "grave: mani" } : { passa: true, motivo: null };
    const r = await eseguiGruppo({ scena: "x", persone: [p("a"), p("b")], riferimenti: RIF, genera, volti, giudica });
    expect(r.png.toString()).toBe("u1"); // si resta sulla scena, che era buona
    expect(r.ripassato).toBeNull();
  });

  it("giudice che non risponde: il gruppo esce come prima (fail-open)", async () => {
    let n = 0;
    const genera = async () => ({ png: Buffer.from(`u${++n}`), costoCent: 5 });
    const volti = async () => [{ x: 1, lato: 150, desc: [0.2] }, { x: 2, lato: 150, desc: [10.1] }];
    const r = await eseguiGruppo({ scena: "x", persone: [p("a"), p("b")], riferimenti: RIF, genera, volti, giudica: async () => { throw new Error("rete"); } });
    expect(n).toBe(1);
    expect(r.qualita).toBeNull();
  });
});
