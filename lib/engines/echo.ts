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

const GEN_URL = "https://api.openai.com/v1/images/generations";
const EDIT_URL = "https://api.openai.com/v1/images/edits";
const MODEL = "gpt-image-2";

export type EchoSize = "1024x1024" | "1536x1024" | "1024x1536";

export interface EchoInput {
  /** Prompt finale già composto (suffisso identità di sistema + prompt sanitizzato del compratore). */
  prompt: string;
  size?: EchoSize;
  /** Reference-set dell'avatar (foto reali ridimensionate) per l'identity-lock. */
  references?: Buffer[];
}

export interface EchoResult {
  png: Buffer;
  model: string;
  mode: "generation" | "edit";
  refsUsed: number;
}

/** Vero se la chiave è presente: permette di "accendere" ECHO senza far crashare il resto. */
export function isEchoConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Estrae i byte PNG dalla risposta dell'API (b64 o url).
async function pngFromResponse(text: string): Promise<Buffer> {
  let json: { data?: { b64_json?: string; url?: string }[] };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`ECHO: risposta non-JSON: ${text.slice(0, 300)}`);
  }
  const item = json.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item?.url) return Buffer.from(await (await fetch(item.url)).arrayBuffer());
  throw new Error("ECHO: nessuna immagine nella risposta dell'API.");
}

/** Una generazione ECHO (gpt-image-2). Lancia un Error col messaggio esatto dell'API in caso di fallimento. */
export async function generateEcho(input: EchoInput): Promise<EchoResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("ECHO non configurato: OPENAI_API_KEY mancante.");

  const size = input.size ?? "1024x1024";
  const refs = input.references ?? [];

  // ── Identity-lock: edit endpoint multi-immagine ──────────────────────────
  if (refs.length > 0) {
    const form = new FormData();
    form.append("model", MODEL);
    form.append("prompt", input.prompt);
    form.append("size", size);
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
    if (!res.ok) throw new Error(`OpenAI edit ${res.status}: ${text.slice(0, 600)}`);
    return { png: await pngFromResponse(text), model: MODEL, mode: "edit", refsUsed: refs.length };
  }

  // ── Senza reference: text-to-image ───────────────────────────────────────
  const res = await fetch(GEN_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: input.prompt, size, n: 1 }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${text.slice(0, 600)}`);
  return { png: await pngFromResponse(text), model: MODEL, mode: "generation", refsUsed: 0 };
}
