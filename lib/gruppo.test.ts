import { describe, expect, it } from "vitest";
import { descrizioneBreve, dividiRoyalty, eseguiGruppo, fotoPerPersona, prezzoGruppo, promptPassaggio, promptScena, type Protagonista } from "./gruppo";
import type { Riferimento } from "./identity-score";

const foto = (n: number) => Array.from({ length: n }, (_, i) => Buffer.from(`f${i}`));
const p = (alias: string): Protagonista => ({ avatarId: alias, handle: alias, alias, identityText: `${alias} identity`, foto: foto(8) });

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

  it("prezzo: N persone = N+1 scatti, la parte delle persone divisa", () => {
    const g = prezzoGruppo({ gross_cents: 24, fee_cents: 20, net_cents: 4, surcharge_cents: 11 }, 2);
    expect(g.gross_cents).toBe(72);
    expect(g.royalty_cents).toBe(12);
    expect(g.fee_cents + g.royalty_cents).toBe(72);
    expect(g.surcharge_cents).toBe(33);
    expect(g.quote).toEqual([6, 6]);
  });

  it("royalty in parti uguali, il resto al primo", () => {
    expect(dividiRoyalty(10, 3)).toEqual([4, 3, 3]);
    expect(dividiRoyalty(9, 3).reduce((a, b) => a + b, 0)).toBe(9);
  });

  it("scena, poi un passaggio per persona con la foto corrente davanti", async () => {
    const chiamate: { prompt: string; n: number; primo: string }[] = [];
    const genera = async (prompt: string, imm: Buffer[]) => {
      chiamate.push({ prompt, n: imm.length, primo: imm[0].toString() });
      return { png: Buffer.from(`uscita${chiamate.length}`), costoCent: 7 };
    };
    const volti = async () => [{ x: 100, lato: 150, desc: [0] }, { x: 400, lato: 150, desc: [1] }];
    const r = await eseguiGruppo({ scena: "al bar", persone: [p("gabriella"), p("stella")], riferimenti: [null, null], genera, volti });
    expect(chiamate).toHaveLength(3); // scena + 2 passaggi
    expect(chiamate[0].n).toBe(8); // 4 foto a testa
    expect(chiamate[1].primo).toBe("uscita1"); // il passaggio parte dalla scena
    expect(chiamate[2].primo).toBe("uscita2"); // e il secondo dal primo passaggio
    expect(chiamate[2].n).toBe(9); // la foto corrente + le 8 foto vere di Stella
    expect(r.costoCent).toBe(21);
  });

  it("se nella scena mancano volti la rifa' una volta", async () => {
    let n = 0;
    const genera = async () => ({ png: Buffer.from(`u${++n}`), costoCent: 5 });
    let visti = 0;
    const volti = async () => (visti++ === 0 ? [{ x: 1, lato: 150, desc: [0] }] : [{ x: 1, lato: 150, desc: [0] }, { x: 2, lato: 150, desc: [1] }]);
    const r = await eseguiGruppo({ scena: "x", persone: [p("a"), p("b")], riferimenti: [], genera, volti });
    expect(n).toBe(4); // 2 scene + 2 passaggi
    expect(r.volti).toBe(2);
  });

  it("in applica ripassa una volta chi resta sotto soglia e tiene la versione migliore", async () => {
    // due persone: descrittori a una dimensione, cosi' la distanza si legge a occhio
    const rif: Riferimento[] = [
      { chiave: "a", rif: [[0], [0]], coerenza: null },
      { chiave: "b", rif: [[10], [10]], coerenza: null },
    ];
    let n = 0;
    const genera = async () => ({ png: Buffer.from(`u${++n}`), costoCent: 5 });
    const volti = async (png: Buffer) => {
      const s = png.toString();
      // fino al terzo scatto "b" e' lontana (0,7); dal quarto (il ripasso) e' vicina (0,3)
      const b = s === "u4" ? 10.3 : 10.7;
      return [{ x: 1, lato: 150, desc: [0.2] }, { x: 2, lato: 150, desc: [b] }];
    };
    const r = await eseguiGruppo({ scena: "x", persone: [p("a"), p("b")], riferimenti: rif, genera, volti, ripassa: true });
    expect(n).toBe(4); // scena + 2 passaggi + 1 ripasso
    expect(r.ripassato).toBe("b");
    expect(r.png.toString()).toBe("u4");
    expect(r.misura?.persone.find((x) => x.chiave === "b")?.distanza).toBeCloseTo(0.3, 5);
  });
});
