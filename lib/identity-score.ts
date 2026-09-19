// ──────────────────────────────────────────────────────────────────────────
// Somiglianza misurata (19/9/2026). Semblic vende la somiglianza: ogni scatto
// si misura contro le foto VERE e verificate della persona (reference-set) con
// lo stesso stack della tutela (face-api WASM, FaceNet 128-d). Il numero va sul
// certificato; la regola "protagonisti e folla" dice che ogni volto
// riconoscibile nello scatto deve essere un protagonista scelto dal registro.
//
// Taratura dalle prove del 19/9 (distanza FaceNet, piu' bassa = piu' simile):
// le foto vere di Gabriella fra loro 0,478, di Stella 0,570; Anima da scatto
// certificato 0,31-0,37; foto di gruppo con un passaggio per volto 0,445.
//
// MODALITA' (env SOMIGLIANZA_MODO):
//  - "osserva" (default): misura e registra, non cambia mai l'esito;
//  - "applica": sotto soglia o con un volto sconosciuto riconoscibile si rifa'
//    UNA volta e si consegna il migliore dei due. Si accende solo dopo aver
//    visto i numeri sulle generazioni vere.
// I descrittori restano in memoria: mai scritti su disco o nel database.
// ──────────────────────────────────────────────────────────────────────────

import { similarityFromDistance } from "@/lib/face-similarity";

export const DISTANZA_OK = 0.5; // sotto: stessa persona ad alta fedelta'
export const DISTANZA_MAX_SOGLIA = 0.52; // la soglia non si allarga oltre: la Stella al 64% (d 0,541) del 19/9 va rifatta, era gia' bocciata a occhio
export const DISTANZA_STESSA_PERSONA = 0.6; // oltre: non e' quella persona
export const LATO_RICONOSCIBILE = 80; // px: volti piu' piccoli sono folla, non ritratti

export type ModoSomiglianza = "osserva" | "applica";
export function modoSomiglianza(): ModoSomiglianza {
  return process.env.SOMIGLIANZA_MODO === "applica" ? "applica" : "osserva";
}

export interface Volto { desc: number[]; lato: number }
export interface Riferimento { chiave: string; rif: number[][]; coerenza: number | null }

export function distanza(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

// Media delle 3 distanze migliori verso le foto della persona: una sola foto
// fortunata non basta, tre danno una misura stabile.
export function distanzaDaPersona(desc: number[], rif: number[][]): number {
  const ds = rif.map((r) => distanza(desc, r)).sort((a, b) => a - b);
  const k = Math.min(3, ds.length);
  return k ? ds.slice(0, k).reduce((x, y) => x + y, 0) / k : Infinity;
}

// Quanto si somigliano fra loro le foto vere: il metro della persona.
export function coerenzaInterna(rif: number[][]): number | null {
  let s = 0, n = 0;
  for (let i = 0; i < rif.length; i++) for (let j = i + 1; j < rif.length; j++) { s += distanza(rif[i], rif[j]); n++; }
  return n ? s / n : null;
}

// Soglia della persona: almeno DISTANZA_OK; per chi ha foto vere molto diverse
// fra loro si allarga fino alla loro coerenza, mai oltre DISTANZA_MAX_SOGLIA.
export function sogliaPer(coerenza: number | null): number {
  if (coerenza == null) return DISTANZA_OK;
  return Math.min(DISTANZA_MAX_SOGLIA, Math.max(DISTANZA_OK, coerenza));
}

export interface EsitoPersona { chiave: string; distanza: number | null; percentuale: number | null; soglia: number; lato: number | null }
export interface MisuraSomiglianza { persone: EsitoPersona[]; sconosciuti: number; volti: number }

// Abbina i volti trovati ai protagonisti (il piu' vicino prima, un volto per
// persona) e conta i volti RICONOSCIBILI che non sono di nessun protagonista.
export function abbina(volti: Volto[], persone: Riferimento[]): MisuraSomiglianza {
  const coppie: { v: number; p: number; d: number }[] = [];
  volti.forEach((vv, v) => persone.forEach((pp, p) => coppie.push({ v, p, d: distanzaDaPersona(vv.desc, pp.rif) })));
  coppie.sort((a, b) => a.d - b.d);
  const voltoPreso = new Set<number>();
  const personaPresa = new Map<number, { d: number; lato: number }>();
  for (const c of coppie) {
    if (voltoPreso.has(c.v) || personaPresa.has(c.p) || c.d > DISTANZA_STESSA_PERSONA + 0.1) continue;
    voltoPreso.add(c.v);
    personaPresa.set(c.p, { d: c.d, lato: volti[c.v].lato });
  }
  const esiti = persone.map((pp, p) => {
    const m = personaPresa.get(p);
    return {
      chiave: pp.chiave,
      distanza: m ? Math.round(m.d * 1000) / 1000 : null,
      percentuale: m ? similarityFromDistance(m.d) : null,
      soglia: sogliaPer(pp.coerenza),
      lato: m ? m.lato : null,
    };
  });
  const sconosciuti = volti.filter((vv, v) => !voltoPreso.has(v) && vv.lato >= LATO_RICONOSCIBILE).length;
  return { persone: esiti, sconosciuti, volti: volti.length };
}

export type Motivo = "somiglianza_bassa" | "volto_assente" | "volto_sconosciuto";
export function verdetto(m: MisuraSomiglianza): { ok: boolean; motivi: Motivo[] } {
  const motivi: Motivo[] = [];
  for (const p of m.persone) {
    if (p.distanza == null) motivi.push("volto_assente");
    else if (p.distanza > p.soglia) motivi.push("somiglianza_bassa");
  }
  if (m.sconosciuti > 0) motivi.push("volto_sconosciuto");
  return { ok: motivi.length === 0, motivi };
}

// Fra due tentativi: prima chi passa il verdetto, poi la distanza peggiore piu' bassa.
export function migliore(a: MisuraSomiglianza | null, b: MisuraSomiglianza | null): boolean {
  if (!a) return false;
  if (!b) return true;
  const oa = verdetto(a).ok, ob = verdetto(b).ok;
  if (oa !== ob) return oa;
  const peggiore = (m: MisuraSomiglianza) => Math.max(...m.persone.map((p) => p.distanza ?? 9));
  return peggiore(a) < peggiore(b);
}

// ── Lato server (face-api) ──────────────────────────────────────────────────

async function voltiIn(img: Buffer): Promise<Volto[]> {
  const { loadFaceApi } = await import("@/lib/ward/matching/embed");
  const faceapi = await loadFaceApi();
  const sharpMod = await import("sharp");
  const sharp = sharpMod.default ?? sharpMod;
  const { data, info } = await sharp(img).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const t = faceapi.tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);
  try {
    const dets: { descriptor: Float32Array; detection: { box: { width: number } } }[] = await faceapi
      .detectAllFaces(t, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
    return dets.map((d) => ({ desc: Array.from(d.descriptor), lato: Math.round(d.detection.box.width) }));
  } finally {
    t.dispose();
  }
}

// Descrittori delle foto vere (il volto piu' grande di ognuna) + coerenza.
export async function riferimentoDa(chiave: string, foto: Buffer[]): Promise<Riferimento | null> {
  const rif: number[][] = [];
  for (const f of foto) {
    try {
      const v = await voltiIn(f);
      if (v.length) rif.push(v.sort((a, b) => b.lato - a.lato)[0].desc);
    } catch {
      /* foto illeggibile: si salta */
    }
  }
  return rif.length ? { chiave, rif, coerenza: coerenzaInterna(rif) } : null;
}

// Cache nel processo (worker): le impronte delle foto vere non cambiano da uno
// scatto all'altro. Solo in memoria, un'ora al massimo, chiave = persona +
// numero di foto (se il reference-set cambia, cambia la chiave).
const cache = new Map<string, { r: Riferimento | null; at: number }>();
export async function riferimentoInCache(chiave: string, foto: Buffer[]): Promise<Riferimento | null> {
  const k = `${chiave}:${foto.length}`;
  const c = cache.get(k);
  if (c && Date.now() - c.at < 60 * 60 * 1000) return c.r;
  const r = await riferimentoDa(chiave, foto);
  cache.set(k, { r, at: Date.now() });
  return r;
}

// Misura uno scatto. null = misuratore non disponibile (non blocca mai).
export async function misuraScatto(png: Buffer, persone: Riferimento[]): Promise<MisuraSomiglianza | null> {
  if (persone.length === 0) return null;
  try {
    return abbina(await voltiIn(png), persone);
  } catch {
    return null;
  }
}
