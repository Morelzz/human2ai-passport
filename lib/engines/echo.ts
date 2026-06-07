// ──────────────────────────────────────────────────────────────────────────
// ECHO — adapter del motore GPT Image 2 (OpenAI). Fa parte dell'architettura
// multi-motore (vedi docs/MULTI_ENGINE.md): i motori sono terze parti invisibili
// sotto il filtro del consenso. SERVER-ONLY: la chiave si legge SOLO da
// process.env.OPENAI_API_KEY, mai dal client. No-op safe se manca la chiave.
// ──────────────────────────────────────────────────────────────────────────

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

export type EchoSize = "1024x1024" | "1536x1024" | "1024x1536";

export interface EchoInput {
  /** Prompt finale già composto (suffisso identità di sistema + prompt sanitizzato del compratore). */
  prompt: string;
  size?: EchoSize;
  /**
   * Reference-set dell'avatar per l'identity-lock (futuro). Quando presente,
   * useremo l'edit endpoint multi-immagine. Per ora l'onboarding del reference-set
   * non esiste ancora, quindi se passato lo segnaliamo come non ancora supportato.
   */
  references?: Buffer[];
}

export interface EchoResult {
  png: Buffer;
  model: string;
}

/** Vero se la chiave è presente: permette di "accendere" ECHO senza far crashare il resto. */
export function isEchoConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/** Una generazione ECHO (gpt-image-2). Ritorna i byte PNG. Lancia un Error con il messaggio esatto dell'API in caso di fallimento. */
export async function generateEcho(input: EchoInput): Promise<EchoResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("ECHO non configurato: OPENAI_API_KEY mancante.");

  if (input.references && input.references.length > 0) {
    // L'identity-lock da reference-set arriverà con il flusso di onboarding dedicato.
    throw new Error("ECHO: identity-lock da reference-set non ancora supportato (TODO multi-engine).");
  }

  const model = "gpt-image-2";
  const res = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: input.prompt, size: input.size ?? "1024x1024", n: 1 }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${text.slice(0, 600)}`);

  let json: { data?: { b64_json?: string; url?: string }[] };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`ECHO: risposta non-JSON: ${text.slice(0, 300)}`);
  }

  const item = json.data?.[0];
  let png: Buffer;
  if (item?.b64_json) {
    png = Buffer.from(item.b64_json, "base64");
  } else if (item?.url) {
    png = Buffer.from(await (await fetch(item.url)).arrayBuffer());
  } else {
    throw new Error("ECHO: nessuna immagine nella risposta dell'API.");
  }

  return { png, model };
}
