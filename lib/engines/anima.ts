// Anima: da uno scatto certificato di Semblic a un video breve con Seedance 2.5,
// via Higgsfield API (image-to-video). SOLO lato server: la chiave non esce mai.
//
// Regole fisse, non opzioni:
// - si parte SEMPRE da uno scatto gia' certificato (primo fotogramma): il volto
//   e' quello della persona consenziente, il motore lo mette in movimento;
// - serve il consenso AL VIDEO della persona (avatars.video_consent), separato
//   da quello all'immagine (decisione di Morelz, 19/9/2026);
// - audio SEMPRE spento: la voce di una persona non e' coperta dal consenso,
//   e un motore che "inventa" una voce la imiterebbe;
// - solo Seedance 2.5 a 720p (scelta di Morelz, 19/9/2026).
//
// Prima prova vera (19/9): Gabriella c4468df7, 5 s, 786x1178, 3 minuti, identita' tenuta.
// Documentazione: https://docs.higgsfield.ai/docs/llms.txt

import { USD_TO_EUR } from "@/lib/engines/echo-cost";

const BASE = "https://api.higgsfield.ai";
export const ENDPOINT_ANIMA = "bytedance/seedance-2.5/image-to-video";
export const DURATE = [5, 10] as const;
export type Durata = (typeof DURATE)[number];

export function isDurata(v: unknown): v is Durata {
  return v === 5 || v === 10;
}

// Movimenti pronti. L'etichetta e' per l'utente, il prompt va al motore.
export const MOVIMENTI = [
  { v: "respira", l: "Respira e guarda in camera", prompt: "breathes calmly, slowly turns the gaze to the camera and gives a soft natural smile, subtle handheld camera, gentle push in" },
  { v: "cammina", l: "Cammina verso di te", prompt: "walks slowly toward the camera with natural confident steps, the camera gently tracks backwards" },
  { v: "sorride", l: "Si volta e sorride", prompt: "turns the head from profile toward the camera and breaks into a genuine smile" },
  { v: "vento", l: "Vento tra i capelli", prompt: "a light breeze moves the hair and the clothes, the person stays still with a calm expression, slow cinematic camera" },
  { v: "orbita", l: "Camera che gira intorno", prompt: "the camera slowly orbits around the person, who stays still and keeps looking into the lens" },
] as const;

const CODA = "Photorealistic, the same person with the same face and the same outfit, natural motion, no text, no logos.";

// Richieste che non passano mai, qualunque cosa dica il motore: nudita' e
// sessualizzazione, violenza, cambio d'eta'. Il volto e' di una persona reale.
const VIETATI = [
  "nud", "spoglia", "svest", "naked", "undress", "topless", "lingerie", "bikini", "sexy", "sesso", "sessual", "erotic",
  "porn", "bacia", "kiss", "sangue", "blood", "ferit", "wound", "weapon", "pistola", "fucile", "coltello", "knife",
  "bambin", "child", "minorenne", "piange",
];

export function movimentoVietato(testo: string): boolean {
  const t = testo.toLowerCase();
  return VIETATI.some((v) => t.includes(v));
}

export function promptPer(movimento: string): string {
  const pronto = MOVIMENTI.find((m) => m.v === movimento);
  const base = pronto ? pronto.prompt : movimento.trim().slice(0, 400);
  return `${base}. ${CODA}`;
}

// Seedance 2.5 a token (dal loro /estimate, 19/9/2026): token = ceil(secondi x
// larghezza x altezza x 24 / 1024), 0,0214 $ ogni 1000 token a 480p/720p,
// prima di eventuali sconti del conto. La prima prova e' uscita 786x1178.
export function costoSeedanceUsd(secondi: number, larghezza = 786, altezza = 1178): number {
  const token = Math.ceil((secondi * larghezza * altezza * 24) / 1024);
  return Math.round((token / 1000) * 0.0214 * 1000) / 1000;
}

// PROPOSTA di prezzo, da confermare con Morelz: costo del motore + ricarico
// x1,5; del ricarico il 45% va alla persona (come per le foto). Niente tetto a
// 2 euro: il video costa piu' di una foto gia' in partenza.
export const RICARICO_VIDEO = 1.5;
export const QUOTA_PERSONA = 0.45;

export interface PrezzoVideo { gross_cents: number; fee_cents: number; royalty_cents: number; cost_cents: number }

export function prezzoAnima(secondi: Durata): PrezzoVideo {
  const cost = Math.ceil(costoSeedanceUsd(secondi) * USD_TO_EUR * 100);
  const gross = Math.ceil(cost * RICARICO_VIDEO);
  const royalty = Math.round((gross - cost) * QUOTA_PERSONA);
  return { gross_cents: gross, fee_cents: gross - royalty, royalty_cents: royalty, cost_cents: cost };
}

function intestazioni(): Record<string, string> {
  const id = process.env.HIGGSFIELD_API_KEY;
  const segreto = process.env.HIGGSFIELD_API_SECRET;
  if (!id || !segreto) throw new Error("Higgsfield non configurato");
  return { Authorization: `Key ${id}:${segreto}`, "Content-Type": "application/json" };
}

export function animaConfigurata(): boolean {
  return Boolean(process.env.HIGGSFIELD_API_KEY && process.env.HIGGSFIELD_API_SECRET);
}

export function corpoPer(immagine: string, movimento: string, secondi: Durata): Record<string, unknown> {
  return { prompt: promptPer(movimento), image_url: immagine, duration: secondi, resolution: "720p", generate_audio: false, output_format: "mp4" };
}

export async function inviaVideo(immagine: string, movimento: string, secondi: Durata): Promise<{ requestId: string }> {
  const res = await fetch(`${BASE}/${ENDPOINT_ANIMA}`, { method: "POST", headers: intestazioni(), body: JSON.stringify(corpoPer(immagine, movimento, secondi)) });
  const j = (await res.json().catch(() => ({}))) as { request_id?: string; detail?: unknown };
  if (!res.ok || !j.request_id) throw new Error(`Higgsfield ${res.status}: ${JSON.stringify(j.detail ?? j).slice(0, 200)}`);
  return { requestId: j.request_id };
}

export type StatoVideo =
  | { stato: "coda" | "lavoro" }
  | { stato: "fatto"; url: string }
  | { stato: "errore"; motivo: "rifiutato" | "fallito" | "annullato"; dettaglio?: string };

export async function statoVideo(requestId: string): Promise<StatoVideo> {
  const res = await fetch(`${BASE}/requests/${encodeURIComponent(requestId)}/status`, { headers: intestazioni() });
  if (!res.ok) throw new Error(`Higgsfield stato ${res.status}`);
  const j = (await res.json()) as { status?: string; video?: { url?: string }; error?: string };
  switch (j.status) {
    case "queued": return { stato: "coda" };
    case "in_progress": return { stato: "lavoro" };
    case "completed": return j.video?.url ? { stato: "fatto", url: j.video.url } : { stato: "errore", motivo: "fallito", dettaglio: "video assente" };
    case "nsfw": return { stato: "errore", motivo: "rifiutato" };
    case "canceled": return { stato: "errore", motivo: "annullato" };
    default: return { stato: "errore", motivo: "fallito", dettaglio: j.error };
  }
}
