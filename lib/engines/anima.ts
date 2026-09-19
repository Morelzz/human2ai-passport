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
// - tre livelli (19/9/2026, Morelz: Seedance e' pesante, servono piu' possibilita'):
//   Rapido (Kling 2.5 Turbo), Standard (Kling 3.0 Turbo), Cinema (Seedance 2.5).
//
// Prima prova vera (19/9): Gabriella c4468df7, 5 s, 786x1178, 3 minuti, identita' tenuta.
// Documentazione: https://docs.higgsfield.ai/docs/llms.txt

import { LIVELLI, MOVIMENTI, type Durata, type LivelloVideo } from "@/lib/engines/anima-prezzi";
export { DURATE, isDurata, isLivello, prezzoAnima, costoSeedanceUsd, LIVELLI, MOVIMENTI, type Durata, type LivelloVideo } from "@/lib/engines/anima-prezzi";

const BASE = "https://api.higgsfield.ai";

// La coda protegge la somiglianza (misure del 19/9: il volto tiene finche' resta in quadro).
const CODA = "Photorealistic, the same person with the same face and the same outfit, natural motion, the face stays visible and inside the frame, steady camera, no text, no logos.";

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

function intestazioni(): Record<string, string> {
  const id = process.env.HIGGSFIELD_API_KEY;
  const segreto = process.env.HIGGSFIELD_API_SECRET;
  if (!id || !segreto) throw new Error("Higgsfield non configurato");
  return { Authorization: `Key ${id}:${segreto}`, "Content-Type": "application/json" };
}

export function animaConfigurata(): boolean {
  return Boolean(process.env.HIGGSFIELD_API_KEY && process.env.HIGGSFIELD_API_SECRET);
}

// Corpo per il motore del livello. Audio sempre spento dove il motore lo prevede.
export function corpoPer(livello: LivelloVideo, immagine: string, movimento: string, secondi: Durata): Record<string, unknown> {
  const base = { prompt: promptPer(movimento), image_url: immagine, duration: secondi };
  if (livello === "cinema") return { ...base, resolution: "720p", generate_audio: false, output_format: "mp4" };
  if (livello === "standard") return { ...base, resolution: "720p" };
  return base;
}

export async function inviaVideo(livello: LivelloVideo, immagine: string, movimento: string, secondi: Durata): Promise<{ requestId: string }> {
  const res = await fetch(`${BASE}/${LIVELLI[livello].endpoint}`, { method: "POST", headers: intestazioni(), body: JSON.stringify(corpoPer(livello, immagine, movimento, secondi)) });
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
