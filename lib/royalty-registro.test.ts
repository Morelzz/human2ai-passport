import { describe, expect, it } from "vitest";
import { maturatoDalRegistro, pagatoDalRegistro, pagabile, type RigheRegistro } from "./royalty-registro";

const vuoto: RigheRegistro = { singoli: [], gruppo: [], video: [], pagati: [] };

describe("quanto si deve davvero a una persona", () => {
  it("somma scatti singoli, scene di gruppo e video", () => {
    const r: RigheRegistro = {
      ...vuoto,
      singoli: [{ royalty_cents: 7 }, { royalty_cents: 7 }, { royalty_cents: null }],
      gruppo: [{ royalty_cents: 6 }],
      video: [{ royalty_cents: 48, posizione: 0, persone: 1 }],
    };
    expect(maturatoDalRegistro(r)).toBe(68);
  });

  it("in un video di gruppo alla persona spetta la sua parte, come la divide il worker", () => {
    // 21 centesimi in tre: 7 a testa
    const r = (pos: number): RigheRegistro => ({ ...vuoto, video: [{ royalty_cents: 21, posizione: pos, persone: 3 }] });
    expect(maturatoDalRegistro(r(0)) + maturatoDalRegistro(r(1)) + maturatoDalRegistro(r(2))).toBe(21);
    // 10 in tre: il resto al primo (4, 3, 3)
    const r10 = (pos: number): RigheRegistro => ({ ...vuoto, video: [{ royalty_cents: 10, posizione: pos, persone: 3 }] });
    expect([0, 1, 2].map((p) => maturatoDalRegistro(r10(p)))).toEqual([4, 3, 3]);
  });

  it("toglie quello che e' gia' stato pagato", () => {
    const r: RigheRegistro = { ...vuoto, singoli: [{ royalty_cents: 6000 }], pagati: [{ amount_cents: 5000 }] };
    expect(pagatoDalRegistro(r)).toBe(5000);
    expect(pagabile(1000, r)).toEqual({ importo: 1000, dovuto: 1000, sospetto: false });
  });

  it("CONTATORE GONFIATO: si paga il giusto e si segnala (la falla del 23/9)", () => {
    // il proprietario si era scritto 999.999 centesimi; il registro ne giustifica 383
    const r: RigheRegistro = { ...vuoto, singoli: Array.from({ length: 20 }, () => ({ royalty_cents: 19 })), gruppo: [{ royalty_cents: 3 }] };
    expect(pagabile(999_999, r)).toEqual({ importo: 383, dovuto: 383, sospetto: true });
  });

  it("contatore indietro: non si paga piu' del contatore", () => {
    const r: RigheRegistro = { ...vuoto, singoli: [{ royalty_cents: 500 }] };
    expect(pagabile(300, r)).toEqual({ importo: 300, dovuto: 500, sospetto: false });
  });

  it("contatore e registro uguali: tutto normale (il caso di ogni persona vera il 23/9)", () => {
    const r: RigheRegistro = { ...vuoto, singoli: [{ royalty_cents: 75 }] };
    expect(pagabile(75, r)).toEqual({ importo: 75, dovuto: 75, sospetto: false });
  });

  it("valori sporchi non fanno danni", () => {
    expect(pagabile(Number.NaN, vuoto)).toEqual({ importo: 0, dovuto: 0, sospetto: false });
    expect(pagabile(-50, vuoto)).toEqual({ importo: 0, dovuto: 0, sospetto: false });
    const troppoPagato: RigheRegistro = { ...vuoto, singoli: [{ royalty_cents: 100 }], pagati: [{ amount_cents: 300 }] };
    expect(pagabile(100, troppoPagato).dovuto).toBe(0);
  });
});
