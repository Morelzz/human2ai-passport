// ──────────────────────────────────────────────────────────────────────────
// ECHO — adapter del motore GPT Image (OpenAI; modello scelto in echo-model.ts). Fa parte dell'architettura
// multi-motore (vedi docs/MULTI_ENGINE.md): i motori sono terze parti invisibili
// sotto il filtro del consenso. SERVER-ONLY: la chiave si legge SOLO da
// process.env.OPENAI_API_KEY, mai dal client. No-op safe se manca la chiave.
//
// Due modalità:
//  - senza reference  -> /v1/images/generations (text-to-image)
//  - con reference-set -> /v1/images/edits (identity-lock: usa le foto reali
//    dell'avatar come riferimento del soggetto, fino a 10 immagini)
// ──────────────────────────────────────────────────────────────────────────

import type { EchoUsage } from "./echo-cost";
import { echoModel } from "./echo-model";

const GEN_URL = "https://api.openai.com/v1/images/generations";
const EDIT_URL = "https://api.openai.com/v1/images/edits";

// Timeout della chiamata a OpenAI: oltre, la consideriamo appesa e la abortiamo
// (un fetch bloccato terrebbe occupata l'unica corsia del worker all'infinito).
// Il 4K high gira ~150s: 4 minuti danno margine abbondante.
const ECHO_TIMEOUT_MS = 240_000;

async function fetchEcho(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ECHO_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Il motore di generazione non ha risposto in tempo. Riprova: nessun costo per te.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Risoluzioni e qualità supportate da gpt-image-2 e 2.5 (lati multipli di 16, lato lungo
// ≤3840, rapporto ≤3:1, pixel 0,65M–8,29M). Quadrato/Verticale/Orizzontale a varie risoluzioni.
export type EchoSize =
  | "1024x1024" | "2048x2048"               // quadrato (HD, 2K)
  | "1024x1536" | "1440x2560" | "2160x3840" // verticale (HD, 2K, 4K)
  | "1536x1024" | "2560x1440" | "3840x2160"; // orizzontale (HD, 2K, 4K)
export type EchoQuality = "low" | "medium" | "high";

export const ECHO_SIZES: EchoSize[] = [
  "1024x1024", "2048x2048",
  "1024x1536", "1440x2560", "2160x3840",
  "1536x1024", "2560x1440", "3840x2160",
];
export const ECHO_QUALITIES: EchoQuality[] = ["low", "medium", "high"];
export function isEchoSize(v: unknown): v is EchoSize {
  return typeof v === "string" && (ECHO_SIZES as string[]).includes(v);
}
export function isEchoQuality(v: unknown): v is EchoQuality {
  return typeof v === "string" && (ECHO_QUALITIES as string[]).includes(v);
}

export interface EchoInput {
  /** Prompt finale già composto (suffisso identità di sistema + prompt sanitizzato del compratore). */
  prompt: string;
  size?: EchoSize;
  quality?: EchoQuality;
  /** Reference-set dell'avatar (foto reali ridimensionate) per l'identity-lock. */
  references?: Buffer[];
}

export interface EchoResult {
  png: Buffer;
  model: string;
  mode: "generation" | "edit";
  refsUsed: number;
  size: string;
  quality: string;
  /** Token effettivi consumati (per calcolare il costo reale). Assente se l'API non lo restituisce. */
  usage?: EchoUsage;
}

/** Vero se la chiave è presente: permette di "accendere" ECHO senza far crashare il resto. */
export function isEchoConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Estrae byte PNG + usage (token consumati) dalla risposta dell'API.
async function parseEchoResponse(text: string): Promise<{ png: Buffer; usage?: EchoUsage }> {
  let json: { data?: { b64_json?: string; url?: string }[]; usage?: EchoUsage };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`ECHO: risposta non-JSON: ${text.slice(0, 300)}`);
  }
  const item = json.data?.[0];
  let png: Buffer;
  if (item?.b64_json) png = Buffer.from(item.b64_json, "base64");
  else if (item?.url) png = Buffer.from(await (await fetch(item.url)).arrayBuffer());
  else throw new Error("ECHO: nessuna immagine nella risposta dell'API.");
  return { png, usage: json.usage };
}

// Errori dell'API resi UMANI: il messaggio dell'Error arriva fino al box
// errore del cliente (in /match via job.error), quindi NIENTE JSON grezzo.
// Il dettaglio tecnico completo resta nei log server per la diagnosi.
// Il filtro del motore ha fermato la generazione: errore riconoscibile, cosi'
// chi chiama puo' riprovare da solo una volta con una scena piu' sobria.
export class ErroreModerazione extends Error {
  constructor(messaggio: string, readonly fase: "input" | "output") {
    super(messaggio);
    this.name = "ErroreModerazione";
  }
}

// Livello di moderazione chiesto al motore: "low" e' il piu' permissivo
// consentito da OpenAI e riduce i falsi allarmi su scene di moda del tutto
// normali (21/9/2026: "due ragazze che posano in un set fotografico di moda"
// veniva fermata). Leva d'emergenza: ECHO_MODERAZIONE=auto.
export function livelloModerazione(): "low" | "auto" {
  return process.env.ECHO_MODERAZIONE === "auto" ? "auto" : "low";
}

// Nota aggiunta al secondo tentativo: descrive persone vestite e una scena
// pubblicabile, senza cambiare quello che ha chiesto il cliente.
export const CLAUSOLA_SOBRIA =
  " Everyone in the image is fully clothed in modest, professional clothing; no swimwear, no lingerie, no suggestive poses; tasteful commercial photography suitable for a general audience.";

export function promptSobrio(prompt: string): string {
  return prompt.includes(CLAUSOLA_SOBRIA) ? prompt : prompt + CLAUSOLA_SOBRIA;
}

function echoApiError(endpoint: "edit" | "generation", status: number, body: string): Error {
  console.error(`[ECHO] OpenAI ${endpoint} ${status}: ${body.slice(0, 1000)}`);
  try {
    const j = JSON.parse(body) as { error?: { code?: string; moderation_details?: { moderation_stage?: string } } };
    if (j?.error?.code === "moderation_blocked") {
      // La moderazione OpenAI è PROBABILISTICA: stesso input può passare al
      // tentativo successivo. stage=input -> reference; stage=output -> risultato.
      const where = j.error?.moderation_details?.moderation_stage === "input"
        ? "la richiesta (la scena descritta o le immagini di riferimento)"
        : "l'immagine generata";
      return new ErroreModerazione(
        `Il sistema di sicurezza del motore ha giudicato sensibile ${where} e ha fermato questa generazione, ` +
        "anche al secondo tentativo. Nessun costo per te. Riprova cambiando qualche parola: spesso basta " +
        "descrivere l'abbigliamento (per esempio \"in giacca e jeans\") o togliere parole come \"set fotografico di moda\".",
        j.error?.moderation_details?.moderation_stage === "input" ? "input" : "output",
      );
    }
  } catch {
    /* body non JSON (es. pagina HTML di Cloudflare): si cade nel messaggio generico */
  }
  return new Error(`Il motore di generazione ha avuto un problema temporaneo. Riprova tra qualche istante.`);
}

/** Una generazione ECHO. In caso di fallimento lancia un Error con messaggio UMANO (dettagli nei log server). */
export async function generateEcho(input: EchoInput): Promise<EchoResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("ECHO non configurato: OPENAI_API_KEY mancante.");

  const size = input.size ?? "1024x1024";
  const quality = input.quality ?? "high";
  const refs = input.references ?? [];
  const model = echoModel();

  // ── Identity-lock: edit endpoint multi-immagine ──────────────────────────
  if (refs.length > 0) {
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", input.prompt);
    form.append("size", size);
    form.append("quality", quality);
    form.append("n", "1");
    form.append("moderation", livelloModerazione());
    refs.forEach((buf, i) => {
      form.append("image[]", new Blob([new Uint8Array(buf)], { type: "image/jpeg" }), `ref-${i}.jpg`);
    });

    const res = await fetchEcho(EDIT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` }, // niente Content-Type: lo imposta FormData col boundary
      body: form,
    });
    const text = await res.text();
    if (!res.ok) throw echoApiError("edit", res.status, text);
    const { png, usage } = await parseEchoResponse(text);
    return { png, model, mode: "edit", refsUsed: refs.length, size, quality, usage };
  }

  // ── Senza reference: text-to-image ───────────────────────────────────────
  const res = await fetchEcho(GEN_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: input.prompt, size, quality, n: 1, moderation: livelloModerazione() }),
  });
  const text = await res.text();
  if (!res.ok) throw echoApiError("generation", res.status, text);
  const { png, usage } = await parseEchoResponse(text);
  return { png, model, mode: "generation", refsUsed: 0, size, quality, usage };
}

// Una generazione che non si arrende al primo falso allarme: se il filtro del
// motore ferma la scena, si riprova UNA volta aggiungendo la clausola sobria.
// Il motore e' iniettabile per i test.
export async function generaConRipiego(
  input: EchoInput,
  motore: (i: EchoInput) => Promise<EchoResult> = generateEcho,
): Promise<EchoResult> {
  try {
    return await motore(input);
  } catch (e) {
    if (!(e instanceof ErroreModerazione)) throw e;
    const prompt = promptSobrio(input.prompt);
    if (prompt === input.prompt) throw e;
    console.warn("[ECHO] filtro del motore: secondo tentativo con la clausola sobria");
    return motore({ ...input, prompt });
  }
}
