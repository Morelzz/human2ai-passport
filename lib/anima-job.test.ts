import { beforeEach, describe, expect, it, vi } from "vitest";

// Motore, storage, VOLT e controllo dei volti finti: si prova la logica del giro.
const stato = vi.fn();
const rimborsi: { user: string; cents: number; ref: string }[] = [];
let esitoVerifica: "ok" | "protetto" | "non_disponibile" = "ok";

vi.mock("@/lib/engines/anima", () => ({ statoVideo: (id: string) => stato(id) }));
vi.mock("@/lib/storage", () => ({ uploadPublicImage: async () => "https://storage/video.mp4" }));
vi.mock("@/lib/volt", () => ({ grantVolt: async (user: string, cents: number, _t: string, ref: string) => { rimborsi.push({ user, cents, ref }); return {}; } }));
vi.mock("@/lib/references", () => ({ getReferenceSet: async () => [Buffer.from("foto")] }));
vi.mock("@/lib/identity-score", () => ({ riferimentoInCache: async (k: string) => ({ chiave: k, rif: [[0]], coerenza: null }), misuraScatto: async () => null }));
vi.mock("@/lib/face-scan-server", () => ({ scanGeneratedImageForProtected: async () => ({}), outputScanVerdict: () => "release" }));
vi.mock("@/lib/video-fotogrammi", () => ({ fotogrammi: async () => [] }));
vi.mock("@/lib/anima-verifica", () => ({
  verificaVideo: async (_v: Buffer, _s: number, _r: unknown[], chiavi: string[]) =>
    esitoVerifica === "ok"
      ? { esito: "ok", fotogrammi: 6, persone: chiavi.map((c) => ({ chiave: c, mediana: 90, minimo: 85, visto: 6 })), sconosciuti: 0 }
      : { esito: esitoVerifica, fotogrammi: 3, persone: [], sconosciuti: 0, istanteProtetto: 2.5 },
  punteggioVideo: () => ({ score: 90, minimo: 85 }),
}));

import { avanzaAnimazioni, MESSAGGIO_PROTETTO } from "./anima-job";

// Database finto: tabelle in memoria e il sottoinsieme di query che usa il giro.
type Riga = Record<string, unknown>;
function db(tabelle: Record<string, Riga[]>) {
  return {
    from(nome: string) {
      const righe = (tabelle[nome] ??= []);
      const filtri: ((r: Riga) => boolean)[] = [];
      let patch: Riga | null = null;
      let limite = Infinity;
      const q = {
        select: () => q,
        update: (p: Riga) => { patch = p; return q; },
        eq: (c: string, v: unknown) => { filtri.push((r) => r[c] === v); return q; },
        in: (c: string, v: unknown[]) => { filtri.push((r) => v.includes(r[c])); return q; },
        lt: (c: string, v: string) => { filtri.push((r) => typeof r[c] === "string" && (r[c] as string) < v); return q; },
        not: (c: string) => { filtri.push((r) => r[c] != null); return q; },
        order: () => q,
        limit: (n: number) => { limite = n; return q; },
        esegui() {
          const scelte = righe.filter((r) => filtri.every((f) => f(r))).slice(0, limite);
          if (patch) for (const r of scelte) Object.assign(r, patch);
          return { data: scelte, error: null };
        },
        maybeSingle: async () => { const { data } = q.esegui(); return { data: data[0] ?? null, error: null }; },
        then: (ok: (x: { data: Riga[]; error: null }) => unknown) => Promise.resolve(q.esegui()).then(ok),
      };
      return q;
    },
  };
}

const video = (id: string, extra: Riga = {}): Riga => ({
  id, buyer_id: "buyer", avatar_id: "gabriella-id", source_generation_id: `gen-${id}`, provider_request_id: `req-${id}`,
  status: "running", movement: "respira", seconds: 5, gross_cents: 78, royalty_cents: 10, created_at: new Date().toISOString(), ...extra,
});

let tabelle: Record<string, Riga[]>;
beforeEach(() => {
  rimborsi.length = 0;
  esitoVerifica = "ok";
  stato.mockReset();
  tabelle = {
    animations: [],
    generation_people: [],
    avatars: [
      { id: "gabriella-id", handle: "gabriella", usage_count: 0, royalty_accrued_cents: 0 },
      { id: "stella-id", handle: "stella", usage_count: 0, royalty_accrued_cents: 0 },
    ],
  };
  vi.stubGlobal("fetch", async () => ({ arrayBuffer: async () => new ArrayBuffer(20_000) }));
});

const admin = () => db(tabelle) as never;

describe("Anima sul worker", () => {
  it("in lavorazione: non tocca niente", async () => {
    tabelle.animations.push(video("a"));
    stato.mockResolvedValue({ stato: "lavoro" });
    expect(await avanzaAnimazioni(admin())).toBe(0);
    expect(tabelle.animations[0].status).toBe("running");
  });

  it("pronto e pulito: consegnato, certificato, royalty alla persona, somiglianza scritta", async () => {
    tabelle.animations.push(video("a"));
    stato.mockResolvedValue({ stato: "fatto", url: "https://motore/v.mp4" });
    expect(await avanzaAnimazioni(admin())).toBe(1);
    const a = tabelle.animations[0];
    expect(a.status).toBe("done");
    expect(a.video_url).toBe("https://storage/video.mp4");
    expect(String(a.certificate)).toHaveLength(64);
    expect(a.identity_score).toBe(90);
    expect(a.frames_checked).toBe(6);
    expect(tabelle.avatars[0].royalty_accrued_cents).toBe(10);
    expect(rimborsi).toHaveLength(0);
  });

  it("foto di gruppo: la royalty del video si divide", async () => {
    tabelle.animations.push(video("g", { royalty_cents: 11 }));
    tabelle.generation_people.push({ generation_id: "gen-g", avatar_id: "gabriella-id", posizione: 0 }, { generation_id: "gen-g", avatar_id: "stella-id", posizione: 1 });
    stato.mockResolvedValue({ stato: "fatto", url: "https://motore/v.mp4" });
    await avanzaAnimazioni(admin());
    expect(tabelle.avatars.map((x) => x.royalty_accrued_cents)).toEqual([6, 5]);
  });

  it("volto protetto in un fotogramma: annullato e rimborsato, nessuna royalty", async () => {
    tabelle.animations.push(video("p"));
    stato.mockResolvedValue({ stato: "fatto", url: "https://motore/v.mp4" });
    esitoVerifica = "protetto";
    await avanzaAnimazioni(admin());
    expect(tabelle.animations[0].status).toBe("error");
    expect(tabelle.animations[0].error).toBe(MESSAGGIO_PROTETTO);
    expect(tabelle.animations[0].video_url).toBeUndefined();
    expect(rimborsi).toEqual([{ user: "buyer", cents: 78, ref: "anima:p" }]);
    expect(tabelle.avatars[0].royalty_accrued_cents).toBe(0);
  });

  it("controllo non disponibile: nessuna consegna, torna in coda per il giro dopo", async () => {
    tabelle.animations.push(video("n"));
    stato.mockResolvedValue({ stato: "fatto", url: "https://motore/v.mp4" });
    esitoVerifica = "non_disponibile";
    await avanzaAnimazioni(admin());
    expect(tabelle.animations[0].status).toBe("running");
    expect(tabelle.animations[0].video_url).toBeUndefined();
    expect(rimborsi).toHaveLength(0);
  });

  it("errore del motore: rimborso una volta sola anche con due giri", async () => {
    tabelle.animations.push(video("e"));
    stato.mockResolvedValue({ stato: "errore", motivo: "rifiutato" });
    await avanzaAnimazioni(admin());
    await avanzaAnimazioni(admin());
    expect(tabelle.animations[0].status).toBe("error");
    expect(rimborsi).toHaveLength(1);
  });

  it("chiusura rimasta a meta' da piu' di 10 minuti: torna in coda", async () => {
    tabelle.animations.push(video("o", { status: "finishing", finishing_at: new Date(Date.now() - 11 * 60 * 1000).toISOString() }));
    stato.mockResolvedValue({ stato: "lavoro" });
    await avanzaAnimazioni(admin());
    expect(tabelle.animations[0].status).toBe("running");
  });

  it("oltre tre ore senza video: annullato e rimborsato", async () => {
    tabelle.animations.push(video("v", { created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() }));
    await avanzaAnimazioni(admin());
    expect(tabelle.animations[0].status).toBe("error");
    expect(rimborsi).toHaveLength(1);
    expect(stato).not.toHaveBeenCalled();
  });
});
