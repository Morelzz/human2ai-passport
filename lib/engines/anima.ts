// Anima: da uno scatto certificato di Semblic a un video breve, via Higgsfield
// API (image-to-video). SOLO lato server: la chiave non esce mai dal server.
//
// Regole fisse, non opzioni:
// - si parte SEMPRE da uno scatto gia' certificato (primo fotogramma): il volto
//   e' quello della persona consenziente, il motore lo mette in movimento;
// - audio SEMPRE spento: la voce di una persona non e' coperta dal consenso
//   all'immagine, e un motore che "inventa" una voce la imiterebbe;
// - il prezzo si stima prima (endpoint gratuito /estimate o formula a token).
//
// Documentazione: https://docs.higgsfield.ai/docs/llms.txt (19/9/2026).

const BASE = "https://api.higgsfield.ai";

export type MotoreVideo = "veloce" | "cinema";

export interface Motore {
  v: MotoreVideo;
  l: string;
  desc: string;
  endpoint: string;
  durate: number[];
}

export const MOTORI_VIDEO: Record<MotoreVideo, Motore> = {
  // Kling 3.0 Turbo: 3-15 s, 720p/1080p. Stima verificata 19/9: 5 s = 0,56 $.
  veloce: { v: "veloce", l: "Veloce", desc: "Kling 3.0 Turbo, movimento naturale", endpoint: "kling-video/v3.0-turbo/image-to-video", durate: [5, 10] },
  // Seedance 2.5: 4-30 s, 480p/720p, prezzo a token (vedi costoSeedanceUsd).
  cinema: { v: "cinema", l: "Cinema", desc: "Seedance 2.5, regia e camera piu' ricche", endpoint: "bytedance/seedance-2.5/image-to-video", durate: [5, 10] },
};

export function isMotoreVideo(v: unknown): v is MotoreVideo {
  return v === "veloce" || v === "cinema";
}

// Seedance 2.5 a token (dal loro /estimate, 19/9/2026): token = ceil(secondi x
// larghezza x altezza x 24 / 1024), 0,0214 $ ogni 1000 token a 480p/720p,
// prima di eventuali sconti del conto. 720p verticale = 720 x 1280.
export function costoSeedanceUsd(secondi: number, larghezza = 720, altezza = 1280): number {
  const token = Math.ceil((secondi * larghezza * altezza * 24) / 1024);
  return Math.round((token / 1000) * 0.0214 * 1000) / 1000;
}

export interface Richiesta {
  immagine: string; // URL pubblico del primo fotogramma (lo scatto certificato)
  movimento: string; // cosa succede nel video, in parole
  secondi: number;
}

export function corpoPer(motore: MotoreVideo, r: Richiesta): Record<string, unknown> {
  const secondi = MOTORI_VIDEO[motore].durate.includes(r.secondi) ? r.secondi : MOTORI_VIDEO[motore].durate[0];
  const prompt = r.movimento.trim().slice(0, 2000);
  if (motore === "cinema") {
    return { prompt, image_url: r.immagine, duration: secondi, resolution: "720p", generate_audio: false, output_format: "mp4" };
  }
  return { prompt, image_url: r.immagine, duration: secondi, resolution: "720p" };
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

// Stima in dollari prima di inviare. Kling risponde con un numero; Seedance
// risponde con la formula, e allora si calcola noi.
export async function stimaUsd(motore: MotoreVideo, r: Richiesta): Promise<number | null> {
  const corpo = corpoPer(motore, r);
  const res = await fetch(`${BASE}/estimate/${MOTORI_VIDEO[motore].endpoint}`, { method: "POST", headers: intestazioni(), body: JSON.stringify(corpo) });
  if (!res.ok) return null;
  const j = (await res.json()) as { type?: string; usd?: string };
  if (j.type === "estimate" && j.usd) return Number(j.usd);
  if (motore === "cinema") return costoSeedanceUsd(Number(corpo.duration));
  return null;
}

export async function inviaVideo(motore: MotoreVideo, r: Richiesta): Promise<{ requestId: string }> {
  const res = await fetch(`${BASE}/${MOTORI_VIDEO[motore].endpoint}`, { method: "POST", headers: intestazioni(), body: JSON.stringify(corpoPer(motore, r)) });
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
