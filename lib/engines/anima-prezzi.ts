// Anima: livelli e prezzi. Modulo PURO (niente chiavi, niente rete): lo usano
// sia il server (che fa pagare) sia la pagina (che mostra il prezzo prima).
// Costi dal /estimate gratuito di Higgsfield, 19/9/2026, prima degli sconti del conto.

import { USD_TO_EUR } from "@/lib/engines/echo-cost";

// Movimenti pronti. L'etichetta e' per l'utente, il prompt va al motore.
export const MOVIMENTI = [
  { v: "respira", l: "Respira e guarda in camera", prompt: "breathes calmly, slowly turns the gaze to the camera and gives a soft natural smile, subtle handheld camera, gentle push in" },
  { v: "cammina", l: "Cammina verso di te", prompt: "walks slowly toward the camera with natural confident steps, the camera gently tracks backwards" },
  { v: "sorride", l: "Si volta e sorride", prompt: "turns the head from profile toward the camera and breaks into a genuine smile" },
  { v: "vento", l: "Vento tra i capelli", prompt: "a light breeze moves the hair and the clothes, the person stays still with a calm expression, slow cinematic camera" },
  { v: "orbita", l: "Camera che gira intorno", prompt: "the camera slowly orbits around the person, who stays still and keeps looking into the lens" },
] as const;

export type LivelloVideo = "rapido" | "standard" | "cinema";
export const DURATE = [5, 10] as const;
export type Durata = (typeof DURATE)[number];

export interface Livello {
  v: LivelloVideo;
  l: string;
  desc: string;
  endpoint: string;
  usdAlSecondo: (secondi: number) => number; // costo del motore in dollari per quella durata
}

// Seedance 2.5 a token: ceil(s x w x h x 24 / 1024), 0,0214 $ ogni 1000 token.
// La prima prova vera e' uscita 786x1178.
export function costoSeedanceUsd(secondi: number, larghezza = 786, altezza = 1178): number {
  const token = Math.ceil((secondi * larghezza * altezza * 24) / 1024);
  return Math.round((token / 1000) * 0.0214 * 1000) / 1000;
}

export const LIVELLI: Record<LivelloVideo, Livello> = {
  // Kling 2.5 Turbo standard: 5 o 10 s, 0,21 $ ogni 5 s.
  rapido: { v: "rapido", l: "Rapido", desc: "movimento semplice, pronto in fretta", endpoint: "kling-video/v2.5-turbo/standard/image-to-video", usdAlSecondo: (s) => 0.042 * s },
  // Kling 3.0 Turbo: 0,56 $ ogni 5 s, movimento piu' naturale.
  standard: { v: "standard", l: "Standard", desc: "movimento naturale, il giusto equilibrio", endpoint: "kling-video/v3.0-turbo/image-to-video", usdAlSecondo: (s) => 0.112 * s },
  // Seedance 2.5 a 720p: regia e camera piu' ricche, la prova su Gabriella ha tenuto il volto al 91-95%.
  cinema: { v: "cinema", l: "Cinema", desc: "regia e camera da film", endpoint: "bytedance/seedance-2.5/image-to-video", usdAlSecondo: (s) => costoSeedanceUsd(s) },
};

export function isLivello(v: unknown): v is LivelloVideo {
  return v === "rapido" || v === "standard" || v === "cinema";
}
export function isDurata(v: unknown): v is Durata {
  return v === 5 || v === 10;
}

// PROPOSTA di prezzo (da confermare con Morelz): costo del motore + ricarico
// x1,5; del ricarico il 45% va alla persona, come per le foto.
export const RICARICO_VIDEO = 1.5;
export const QUOTA_PERSONA = 0.45;

export interface PrezzoVideo { gross_cents: number; fee_cents: number; royalty_cents: number; cost_cents: number }

export function prezzoAnima(livello: LivelloVideo, secondi: Durata): PrezzoVideo {
  const cost = Math.ceil(LIVELLI[livello].usdAlSecondo(secondi) * USD_TO_EUR * 100);
  const gross = Math.ceil(cost * RICARICO_VIDEO);
  const royalty = Math.round((gross - cost) * QUOTA_PERSONA);
  return { gross_cents: gross, fee_cents: gross - royalty, royalty_cents: royalty, cost_cents: cost };
}
