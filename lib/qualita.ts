// ──────────────────────────────────────────────────────────────────────────
// IL CONTROLLO QUALITA' (23/9/2026). Fino a oggi misuravamo se il volto
// somiglia alla persona, non se la foto e' BELLA. Il 21/9 e' uscito uno scatto
// con la pelle maculata "come un'AI di dieci anni fa", e nessun controllo se
// n'e' accorto. Adesso un secondo occhio guarda ogni scatto prima della
// consegna: Claude con la vista descrive i difetti, e questo codice decide.
//
// Regole che non si toccano:
//  - IL MODELLO DESCRIVE, IL CODICE DECIDE. Il verdetto finale (verdettoQualita)
//    e' una funzione pura con soglie scritte qui e provate: non ci si fida di un
//    "ok" detto a parole.
//  - FAIL-OPEN. Questo e' un controllo di qualita', non di tutela: se il giudice
//    non risponde (rete, rifiuto, modello non disponibile) lo scatto esce come
//    usciva ieri. La tutela dei volti protetti resta fail-closed, altrove.
//  - Il giudice vede la foto intera (lato lungo 1024, JPEG) PIU' un primo piano
//    di ogni volto ad alta risoluzione. Tarato il 23/9 sulle foto vere del
//    banco: a foto intera i difetti dei volti si perdono, come si perdevano a
//    occhio finche' Morelz non ha ingrandito il viso di Stella.
//  - Il giudice NON riceve le foto vere di riferimento delle persone: sono dati
//    biometrici verificati e un nuovo destinatario e' una scelta di privacy, non
//    tecnica. L'identita' la misura lib/identity-score sul nostro server. Qui si
//    giudica la RESA: pelle, mani, occhi, testo, e volti clonati nei gruppi.
// SERVER-ONLY (la parte che chiama l'API).
// ──────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";

export const TIPI_DIFETTO = [
  "pelle_impastata", // pelle cerosa, maculata, a chiazze, "plastica"
  "rumore_o_macchie", // grana, blocchi, macchie di colore che non stanno nella scena
  "mani", // dita in piu' o in meno, fuse, piegate male
  "occhi", // asimmetrici, sguardo storto, pupille rotte
  "denti", // fusi, troppi, deformati
  "volto_deformato", // proporzioni sbagliate, lineamenti che si sciolgono
  "testo_spurio", // scritte inventate, lettere senza senso
  "oggetti_fusi", // oggetti o arti che si compenetrano
  "anatomia", // corpo, collo, arti impossibili
  "volti_clonati", // in un gruppo, due o piu' persone con la STESSA faccia
  "fuori_richiesta", // la foto contraddice la richiesta (numero di persone, luogo)
  "altro",
] as const;
export type TipoDifetto = (typeof TIPI_DIFETTO)[number];
export type Gravita = "lieve" | "evidente" | "grave";

export interface Giudizio {
  voto: number; // 0-100: quanto e' consegnabile a un cliente pagante
  difetti: { tipo: TipoDifetto; gravita: Gravita; dove: string }[];
  nota: string; // una frase, in italiano
}

export interface VerdettoQualita {
  passa: boolean;
  motivo: string | null; // perche' non passa, per i log
}

// SOGLIE. Una foto generata ha sempre qualche imperfezione: si scarta solo
// quella che un cliente scarterebbe. Un difetto grave basta; due evidenti
// bastano; un voto sotto 55 basta.
export const VOTO_MINIMO = 55;

export function verdettoQualita(g: Giudizio): VerdettoQualita {
  const gravi = g.difetti.filter((d) => d.gravita === "grave");
  const evidenti = g.difetti.filter((d) => d.gravita === "evidente");
  if (gravi.length) return { passa: false, motivo: `grave: ${gravi.map((d) => d.tipo).join(", ")}` };
  if (evidenti.length >= 2) return { passa: false, motivo: `evidenti: ${evidenti.map((d) => d.tipo).join(", ")}` };
  if (!Number.isFinite(g.voto) || g.voto < VOTO_MINIMO) return { passa: false, motivo: `voto ${g.voto}` };
  return { passa: true, motivo: null };
}

/**
 * Fra due tentativi, quale consegnare: prima quello che passa il controllo
 * qualita'; a parita', decide il criterio di somiglianza del chiamante.
 * `null` = giudice non disponibile, conta come "passa" (fail-open).
 */
export function preferisci(a: VerdettoQualita | null, b: VerdettoQualita | null, somigliaMeglio: boolean): boolean {
  const pa = a?.passa ?? true;
  const pb = b?.passa ?? true;
  if (pa !== pb) return pa;
  return somigliaMeglio;
}

/** Quello che si scrive sul lavoro: voto, esito e difetti, oppure "non fatto". */
export function qualitaPerRegistro(g: Giudizio | null, v: VerdettoQualita | null) {
  if (!g || !v) return { fatto: false as const };
  return { fatto: true as const, voto: g.voto, passa: v.passa, motivo: v.motivo, difetti: g.difetti, nota: g.nota };
}

// ── Il giudice (SERVER-ONLY) ────────────────────────────────────────────────

// L'interruttore: QUALITA_CONTROLLO=0 lo spegne (costi, falsi allarmi) senza
// toccare il codice. Acceso di default.
export function qualitaAttiva(env: Record<string, string | undefined> = process.env): boolean {
  return env.QUALITA_CONTROLLO !== "0";
}

/** Quanto e' costato un giudizio, in centesimi (listino Opus 5.5: 4$ / 20$ per milione). */
export function costoGiudizioCent(input: number, output: number): number {
  return ((input * 4 + output * 20) / 1e6) * 100;
}

// Opus 5.5 perche' l'ha chiesto Morelz il 23/9. Si cambia da fuori senza toccare il codice.
export function modelloQualita(env: Record<string, string | undefined> = process.env): string {
  return env.QUALITA_MODELLO || "claude-opus-5-5";
}
const MODELLO_RISERVA = "claude-opus-5";

const SCHEMA = {
  type: "object",
  properties: {
    voto: { type: "integer", description: "0-100: how deliverable this is to a paying client" },
    difetti: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: [...TIPI_DIFETTO] },
          gravita: { type: "string", enum: ["lieve", "evidente", "grave"] },
          dove: { type: "string", description: "where in the image, a few words in Italian" },
        },
        required: ["tipo", "gravita", "dove"],
        additionalProperties: false,
      },
    },
    nota: { type: "string", description: "one sentence in Italian" },
  },
  required: ["voto", "difetti", "nota"],
  additionalProperties: false,
} as const;

const SISTEMA = `You are the final quality check of a commercial photo studio. Every image you see was generated by an AI image model from real, verified photos of a real person, and is about to be delivered to a paying client as a photograph.

Judge it as a demanding photo editor would, and list only defects a client would actually notice at normal viewing size:
- pelle_impastata: waxy, plastic, smeared or blotchy skin; mottled patches of color on the face or body
- rumore_o_macchie: grain, blocky compression, color splotches that do not belong to the scene
- mani, occhi, denti, anatomia, volto_deformato, oggetti_fusi: the classic generation errors
- testo_spurio: invented lettering or garbled text anywhere in the frame
- volti_clonati: in a photo with two or more people, faces that look like the same person copied (same face shape, eyes, nose and mouth, as twins). Each person in the brief is a different real person, so near-identical faces mean the model lost one of them. This is grave.
- fuori_richiesta: only when the photo plainly contradicts the brief (a different number of people, a completely different place). Do not be pedantic about style, pose or clothing.

Severity:
- lieve: visible only if you look for it; a client would not complain
- evidente: a careful client would notice and ask for a redo
- grave: nobody would publish this

Real photographs have natural skin texture, pores, freckles, film grain and bokeh: those are NOT defects. Do not invent problems to have something to say; an empty list is a normal answer for a good image. Write "dove" and "nota" in Italian.`;

let client: Anthropic | null = null;
function cliente(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

async function comeJpeg(png: Buffer): Promise<string> {
  const sharp = (await import("sharp")).default;
  const out = await sharp(png)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return out.toString("base64");
}

// I primi piani: ogni volto trovato, con un po' d'aria attorno, dalla foto a
// risoluzione PIENA e portato a 512. Al massimo 4 (i gruppi arrivano a 4).
async function primiPiani(png: Buffer): Promise<string[]> {
  try {
    const sharp = (await import("sharp")).default;
    const { voltiConRiquadro } = await import("@/lib/kit-campagna");
    const volti = (await voltiConRiquadro(png)).sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 4);
    const meta = await sharp(png).metadata();
    const W = meta.width ?? 0, H = meta.height ?? 0;
    const out: string[] = [];
    for (const v of volti.sort((a, b) => a.x - b.x)) {
      const m = Math.round(Math.max(v.w, v.h) * 0.35);
      const left = Math.max(0, Math.round(v.x - m)), top = Math.max(0, Math.round(v.y - m));
      const width = Math.min(W - left, Math.round(v.w + 2 * m)), height = Math.min(H - top, Math.round(v.h + 2 * m));
      if (width < 32 || height < 32) continue;
      const b = await sharp(png).extract({ left, top, width, height }).resize({ width: 512, height: 512, fit: "inside" }).jpeg({ quality: 90 }).toBuffer();
      out.push(b.toString("base64"));
    }
    return out;
  } catch {
    return []; // senza riconoscitore si giudica la foto intera
  }
}

/**
 * Guarda lo scatto e torna il giudizio, o null se il giudice non e' disponibile
 * (manca la chiave, rete, rifiuto, risposta illeggibile). Mai un'eccezione:
 * un controllo di qualita' non deve fermare una consegna.
 */
export async function giudicaScatto(
  png: Buffer,
  contesto: { scena?: string | null } = {},
  opzioni: { traccia?: (u: { modello: string; input: number; output: number; ms: number }) => void } = {},
): Promise<Giudizio | null> {
  if (!qualitaAttiva()) return null;
  const c = cliente();
  if (!c) return null;
  let data: string;
  try {
    data = await comeJpeg(png);
  } catch {
    return null;
  }
  const volti = await primiPiani(png);

  const chiedi = (model: string) =>
    c.messages.parse({
      model,
      max_tokens: 4000,
      // Opus 5.5 pensa sempre; "medium" e' il suo default, scritto esplicito.
      output_config: { effort: "medium", format: jsonSchemaOutputFormat(SCHEMA) },
      system: SISTEMA,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "The full photo:" },
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
            ...(volti.length
              ? [
                  { type: "text" as const, text: `Close-ups of the ${volti.length} face(s) found, left to right, cut from the full-resolution file:` },
                  ...volti.map((v) => ({ type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: v } })),
                ]
              : []),
            {
              type: "text",
              text: contesto.scena
                ? `The client asked for: "${contesto.scena.slice(0, 400)}". Judge the photo.`
                : "Judge the photo.",
            },
          ],
        },
      ],
    });

  const t0 = Date.now();
  let usato = modelloQualita();
  try {
    let risposta;
    try {
      risposta = await chiedi(modelloQualita());
    } catch (e) {
      // Modello non ancora abilitato su questa chiave: si ripiega una volta.
      if (e instanceof Anthropic.NotFoundError && modelloQualita() !== MODELLO_RISERVA) {
        console.warn(`[qualita] ${modelloQualita()} non disponibile, uso ${MODELLO_RISERVA}`);
        usato = MODELLO_RISERVA;
        risposta = await chiedi(MODELLO_RISERVA);
      } else throw e;
    }
    opzioni.traccia?.({ modello: usato, input: risposta.usage.input_tokens, output: risposta.usage.output_tokens, ms: Date.now() - t0 });
    if (risposta.stop_reason === "refusal") {
      console.warn(`[qualita] il giudice ha rifiutato (${risposta.stop_details?.category ?? "?"}): scatto consegnato senza controllo`);
      return null;
    }
    const g = risposta.parsed_output as Giudizio | null;
    if (!g || !Array.isArray(g.difetti)) return null;
    return { voto: Math.round(Number(g.voto)), difetti: g.difetti, nota: String(g.nota ?? "") };
  } catch (e) {
    console.warn("[qualita] giudice non disponibile:", e instanceof Error ? e.message : e);
    return null;
  }
}
