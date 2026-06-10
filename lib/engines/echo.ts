// ──────────────────────────────────────────────────────────────────────────
// ECHO — adapter del motore GPT Image 2 (OpenAI). Fa parte dell'architettura
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

const GEN_URL = "https://api.openai.com/v1/images/generations";
const EDIT_URL = "https://api.openai.com/v1/images/edits";
const MODEL = "gpt-image-2";

// Risoluzioni e qualità supportate da gpt-image-2 (lati multipli di 16, lato lungo
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
      return new Error(
        `Il sistema di sicurezza del motore ha giudicato sensibile ${where} e ha fermato questa generazione. ` +
        "Nessun costo per te. Riprova: spesso basta rigenerare. Se si ripete, descrivi una scena più sobria " +
        "(per esempio specifica un abbigliamento più coperto)."
      );
    }
  } catch {
    /* body non JSON (es. pagina HTML di Cloudflare): si cade nel messaggio generico */
  }
  return new Error(`Il motore di generazione ha avuto un problema temporaneo. Riprova tra qualche istante.`);
}

/** Una generazione ECHO (gpt-image-2). In caso di fallimento lancia un Error con messaggio UMANO (dettagli nei log server). */
export async function generateEcho(input: EchoInput): Promise<EchoResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("ECHO non configurato: OPENAI_API_KEY mancante.");

  const size = input.size ?? "1024x1024";
  const quality = input.quality ?? "high";
  const refs = input.references ?? [];

  // ── Identity-lock: edit endpoint multi-immagine ──────────────────────────
  if (refs.length > 0) {
    const form = new FormData();
    form.append("model", MODEL);
    form.append("prompt", input.prompt);
    form.append("size", size);
    form.append("quality", quality);
    form.append("n", "1");
    refs.forEach((buf, i) => {
      form.append("image[]", new Blob([new Uint8Array(buf)], { type: "image/jpeg" }), `ref-${i}.jpg`);
    });

    const res = await fetch(EDIT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` }, // niente Content-Type: lo imposta FormData col boundary
      body: form,
    });
    const text = await res.text();
    if (!res.ok) throw echoApiError("edit", res.status, text);
    const { png, usage } = await parseEchoResponse(text);
    return { png, model: MODEL, mode: "edit", refsUsed: refs.length, size, quality, usage };
  }

  // ── Senza reference: text-to-image ───────────────────────────────────────
  const res = await fetch(GEN_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: input.prompt, size, quality, n: 1 }),
  });
  const text = await res.text();
  if (!res.ok) throw echoApiError("generation", res.status, text);
  const { png, usage } = await parseEchoResponse(text);
  return { png, model: MODEL, mode: "generation", refsUsed: 0, size, quality, usage };
}
