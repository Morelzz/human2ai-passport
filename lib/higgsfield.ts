import crypto from "crypto";

// Bridge verso il motore di generazione (Higgsfield Soul).
// Il motore è una terza parte INVISIBILE all'utente finale: vive SOLO lato server,
// la chiave sta in .env.local e non esce mai nel client.
//
// Due modalità, selezionate via env HIGGSFIELD_MODE:
//   - "mock" (default, offline): nessuna rete, output deterministico simulato.
//   - "live": chiama l'API reale (da configurare quando avrai la chiave).
//
// Il resto della piattaforma usa SOLO generateWithHiggsfield(): cambiando modalità
// non si tocca nient'altro (match, certificato, royalty restano identici).

import type { SoulModel } from "@/lib/soul-models";

export interface HiggsfieldInput {
  avatarId: string;
  // Riferimento del soggetto reale sul motore (es. id del modello Soul addestrato).
  // Per gli avatar demo può essere null: il mock genera comunque un placeholder.
  soulRef: string | null;
  prompt: string;
  // Modello di generazione (default Soul 2.0). Tutti identity-locked.
  model?: SoulModel;
  // Stile Soul (solo per Soul ID v1): id di uno stile dal catalogo.
  styleId?: string | null;
  // Anteprima: risoluzione ridotta (il watermark si applica a valle).
  preview?: boolean;
}

export interface HiggsfieldResult {
  engine: "higgsfield-soul";
  mode: "mock" | "live";
  generationRef: string;   // id della generazione sul motore
  status: "completed" | "failed";
  imageUrl: string;        // URL dell'immagine generata
}

function mode(): "mock" | "live" {
  return process.env.HIGGSFIELD_MODE === "live" ? "live" : "mock";
}

// Costruisce il prompt di generazione dalla SOLA scena/direzione artistica.
// Principio: l'identità del volto è garantita dal Soul (custom_reference_id), quindi
// il prompt NON deve descrivere la persona — solo cosa fa, dove, con che luce e stile.
// Questo rende la generazione molto più versatile: scena totalmente libera.
// Se la scena è vuota, ripiega su un ritratto neutro di qualità.
export function buildGenerationPrompt(scene: string): string {
  const s = scene.trim();
  if (!s) {
    return "professional portrait, soft studio lighting, looking at camera, high detail";
  }
  // Scaffolding fotografico leggero, aggiunto solo se l'utente non l'ha già specificato.
  const hasQuality = /\b(8k|4k|hd|detail|sharp|cinematic|photoreal|realistic|lighting|bokeh|lens|mm)\b/i.test(s);
  return hasQuality ? s : `${s}, cinematic lighting, high detail, photorealistic`;
}

// --- MOCK (offline) ---------------------------------------------------------
// Output deterministico: stesso avatar+prompt -> stessa immagine placeholder.
// Simula un piccolo ritardo come farebbe l'API reale.
async function generateMock(input: HiggsfieldInput): Promise<HiggsfieldResult> {
  await new Promise((r) => setTimeout(r, 600));

  const seed = crypto
    .createHash("sha256")
    .update(`${input.avatarId}|${input.prompt}`)
    .digest("hex")
    .slice(0, 16);

  const imageUrl = `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}&backgroundColor=6B21E8`;

  return {
    engine: "higgsfield-soul",
    mode: "mock",
    generationRef: `mock_${seed}`,
    status: "completed",
    imageUrl,
  };
}

// --- LIVE (Higgsfield Soul, SDK ufficiale @higgsfield/client) ----------------
async function generateLive(input: HiggsfieldInput): Promise<HiggsfieldResult> {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET mancanti per la modalità live");
  }
  if (!input.soulRef) {
    // Senza un Soul ID collegato non possiamo garantire l'identità della persona reale.
    throw new Error("soulRef mancante: questo avatar non ha un modello Soul collegato");
  }

  const model = input.model ?? "soul-v2";

  // --- Soul 2.0 (client v2): endpoint higgsfield-ai/soul/v2/standard, 2k ---
  // Il volto reale arriva da soul_id; nessuno stile (il modello ha la sua resa).
  if (model === "soul-v2") {
    const { createHiggsfieldClient } = await import("@higgsfield/client/v2");
    const client = createHiggsfieldClient({ apiKey, apiSecret });
    // Identità garantita da custom_reference_id (il Soul addestrato), forza piena.
    // resolution: '720p'|'1080p' (NON "quality/2k"). enhance_prompt off per non driftare.
    const res = await client.subscribe("higgsfield-ai/soul/v2/standard", {
      input: {
        prompt: input.prompt,
        custom_reference_id: input.soulRef,
        custom_reference_strength: 1,
        resolution: input.preview ? "720p" : "1080p",
        aspect_ratio: "3:4", // ritratto verticale
        enhance_prompt: false,
      },
      withPolling: true,
    });
    const ref = res.request_id;
    if (res.status !== "completed") {
      return { engine: "higgsfield-soul", mode: "live", generationRef: ref, status: "failed", imageUrl: "" };
    }
    const url = res.images?.[0]?.url ?? "";
    return { engine: "higgsfield-soul", mode: "live", generationRef: ref, status: url ? "completed" : "failed", imageUrl: url };
  }

  // --- Soul ID (client v1): /v1/text2image/soul, 1080p, stili applicabili ---
  const { HiggsfieldClient } = await import("@higgsfield/client");
  const client = new HiggsfieldClient({ apiKey, apiSecret });

  // Soul text-to-image con il riferimento del volto reale (custom_reference_id).
  const params: Record<string, unknown> = {
    prompt: input.prompt,
    custom_reference_id: input.soulRef,
    width_and_height: "1536x2048", // ritratto verticale
    quality: input.preview ? "720p" : "1080p",
    batch_size: 1,
  };
  // Stile artistico opzionale (mantiene comunque l'identità dal Soul).
  if (input.styleId) {
    params.style_id = input.styleId;
    params.style_strength = 0.8;
  }

  // withPolling: l'SDK attende il completamento prima di restituire il JobSet.
  const jobSet = await client.generate("/v1/text2image/soul", params, { withPolling: true });

  if (jobSet.isNsfw || !jobSet.isCompleted) {
    return { engine: "higgsfield-soul", mode: "live", generationRef: jobSet.id, status: "failed", imageUrl: "" };
  }

  const imageUrl = jobSet.jobs[0]?.results?.raw.url ?? "";
  if (!imageUrl) {
    return { engine: "higgsfield-soul", mode: "live", generationRef: jobSet.id, status: "failed", imageUrl: "" };
  }

  return { engine: "higgsfield-soul", mode: "live", generationRef: jobSet.id, status: "completed", imageUrl };
}

// Elenca i Soul ID esistenti sull'account (per collegarli agli avatar).
export interface SoulIdItem { id: string; name: string; status: string; }
export async function listSoulIds(): Promise<SoulIdItem[]> {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET mancanti");
  }
  const { HiggsfieldClient } = await import("@higgsfield/client");
  const client = new HiggsfieldClient({ apiKey, apiSecret });
  const res = await client.listSoulIds(1, 100);
  return res.items.map((s) => ({ id: s.id, name: s.name, status: String(s.status) }));
}

export async function generateWithHiggsfield(input: HiggsfieldInput): Promise<HiggsfieldResult> {
  return mode() === "live" ? generateLive(input) : generateMock(input);
}

// --- Creazione di un Soul ID dalle foto reali della persona -----------------
// Carica le foto sulla CDN del motore, poi addestra il Soul (custom reference).
// Costo reale ~20 crediti: lo paga la piattaforma (acquisizione, vedi roadmap).
export interface SoulPhoto {
  buffer: Buffer;
  format: "jpeg" | "png" | "webp";
}

export async function createSoulFromImages(name: string, photos: SoulPhoto[]): Promise<{ id: string } | null> {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET mancanti");
  }

  const { HiggsfieldClient, InputImageType } = await import("@higgsfield/client");
  const client = new HiggsfieldClient({ apiKey, apiSecret });

  // 1. Upload delle foto sulla CDN del motore -> URL utilizzabili.
  const inputImages: { type: typeof InputImageType.IMAGE_URL; image_url: string }[] = [];
  for (const p of photos) {
    const url = await client.uploadImage(p.buffer, p.format);
    inputImages.push({ type: InputImageType.IMAGE_URL, image_url: url });
  }

  // 2. Addestra il Soul (withPolling: attende il completamento).
  const soul = await client.createSoulId({ name, input_images: inputImages }, true);
  if (!soul.isCompleted) return null;
  return { id: soul.id };
}
