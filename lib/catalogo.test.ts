import { describe, expect, it } from "vitest";
import { voltoCatalogo, bollini, conteggi, passaIlFiltro, type RigaCatalogo } from "./catalogo";

const riga = (p: Partial<RigaCatalogo> = {}): RigaCatalogo => ({ handle: "x", alias: "X", ...p });

describe("il catalogo che parla", () => {
  it("il consenso commerciale e' un si' finche' non e' un no esplicito", () => {
    expect(voltoCatalogo(riga()).foto).toBe(true);
    expect(voltoCatalogo(riga({ commercial_consent: true })).foto).toBe(true);
    expect(voltoCatalogo(riga({ commercial_consent: false })).foto).toBe(false);
  });

  it("il video e' un si' SOLO se acceso davvero", () => {
    expect(voltoCatalogo(riga()).video).toBe(false);
    expect(voltoCatalogo(riga({ video_consent: null })).video).toBe(false);
    expect(voltoCatalogo(riga({ video_consent: true })).video).toBe(true);
  });

  it("chi si e' ritirato non risulta disponibile per niente", () => {
    const v = voltoCatalogo(riga({ revoked_at: "2026-09-01", commercial_consent: true, video_consent: true }));
    expect(v.revocato).toBe(true);
    expect(v.foto).toBe(false);
    expect(v.video).toBe(false);
    expect(bollini(v)).toEqual([{ testo: "HA CHIESTO DI USCIRE", tono: "no" }]);
  });

  it("i bollini dicono foto, video e quante volte", () => {
    const b = bollini(voltoCatalogo(riga({ video_consent: true, usage_count: 18 })));
    expect(b.map((x) => x.testo)).toEqual(["FOTO SÌ", "VIDEO SÌ", "USATO 18×"]);
    const nuovo = bollini(voltoCatalogo(riga({ usage_count: 0 })));
    expect(nuovo.map((x) => x.testo)).toEqual(["FOTO SÌ", "VIDEO NO", "MAI USATO"]);
  });

  it("i filtri contano le righe vere", () => {
    const volti = [
      voltoCatalogo(riga({ handle: "a", gender: "donna", video_consent: true, usage_count: 18 })),
      voltoCatalogo(riga({ handle: "b", gender: "donna", usage_count: 0 })),
      voltoCatalogo(riga({ handle: "c", gender: "uomo", video_consent: true, usage_count: 3 })),
      voltoCatalogo(riga({ handle: "d", gender: "uomo", revoked_at: "2026-09-01" })),
    ];
    const n = conteggi(volti);
    expect(n.tutti).toBe(4);
    expect(n.donne).toBe(2);
    expect(n.uomini).toBe(2);
    expect(n.video).toBe(2);
    expect(n.liberi).toBe(3); // il revocato non e' libero
    expect(n.mai).toBe(2); // b (0 usi) e d (revocato, 0 usi)
  });

  it("il genere assente non finisce ne' fra le donne ne' fra gli uomini", () => {
    const v = voltoCatalogo(riga({ gender: null }));
    expect(passaIlFiltro(v, "donne")).toBe(false);
    expect(passaIlFiltro(v, "uomini")).toBe(false);
    expect(passaIlFiltro(v, "tutti")).toBe(true);
  });

  it("un filtro che prende tutti non aggiunge niente (si nasconde a video)", () => {
    const volti = [
      voltoCatalogo(riga({ handle: "a", gender: "donna", video_consent: true })),
      voltoCatalogo(riga({ handle: "b", gender: "donna", video_consent: true })),
    ];
    const n = conteggi(volti);
    expect(n.video).toBe(n.tutti); // tutti dicono si' al video: il filtro sparisce
    expect(n.uomini).toBe(0); // e nessun uomo: sparisce anche quello
  });
});
