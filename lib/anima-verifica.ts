// ──────────────────────────────────────────────────────────────────────────
// ANIMA: il controllo del video prima della consegna (19/9/2026). Come per le
// foto, e fotogramma per fotogramma:
//  - VETO: nessun volto registrato come protetto in nessun fotogramma. Se il
//    controllo non si puo' fare, il video NON esce (fail-closed).
//  - Somiglianza: quanto restano se stesse le persone, fotogramma dopo
//    fotogramma (mediana e minimo). Per ora si registra e si mostra.
// Le dipendenze pesanti (ffmpeg, face-api) sono iniettabili: i test non le toccano.
// ──────────────────────────────────────────────────────────────────────────

import type { MisuraSomiglianza, Riferimento } from "@/lib/identity-score";

export interface SomiglianzaVideo {
  chiave: string;
  mediana: number | null; // % sui fotogrammi dove la persona si vede
  minimo: number | null;
  visto: number; // in quanti fotogrammi
}

export interface EsitoVerifica {
  esito: "ok" | "protetto" | "non_disponibile";
  fotogrammi: number;
  persone: SomiglianzaVideo[];
  sconosciuti: number; // il massimo di volti riconoscibili non abbinati in un fotogramma
  istanteProtetto?: number;
}

function mediana(v: number[]): number | null {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function riassumi(misure: (MisuraSomiglianza | null)[], chiavi: string[]): { persone: SomiglianzaVideo[]; sconosciuti: number } {
  const persone = chiavi.map((chiave) => {
    const valori = misure.flatMap((m) => {
      const p = m?.persone.find((x) => x.chiave === chiave);
      return p && p.percentuale != null ? [p.percentuale] : [];
    });
    return { chiave, mediana: mediana(valori), minimo: valori.length ? Math.min(...valori) : null, visto: valori.length };
  });
  const sconosciuti = Math.max(0, ...misure.map((m) => m?.sconosciuti ?? 0));
  return { persone, sconosciuti };
}

// Il numero che va sul video: la mediana della persona che tiene peggio.
export function punteggioVideo(persone: SomiglianzaVideo[]): { score: number | null; minimo: number | null } {
  const mediane = persone.map((p) => p.mediana).filter((x): x is number => x != null);
  const minimi = persone.map((p) => p.minimo).filter((x): x is number => x != null);
  return { score: mediane.length ? Math.min(...mediane) : null, minimo: minimi.length ? Math.min(...minimi) : null };
}

export interface DipendenzeVerifica {
  estrai: (video: Buffer, secondi: number) => Promise<{ t: number; png: Buffer }[]>;
  scan: (png: Buffer) => Promise<"release" | "regenerate" | "unavailable">;
  misura: (png: Buffer, persone: Riferimento[]) => Promise<MisuraSomiglianza | null>;
}

export async function verificaVideo(
  video: Buffer,
  secondi: number,
  riferimenti: (Riferimento | null)[],
  chiavi: string[],
  dip: DipendenzeVerifica,
): Promise<EsitoVerifica> {
  let quadri: { t: number; png: Buffer }[];
  try {
    quadri = await dip.estrai(video, secondi);
  } catch {
    return { esito: "non_disponibile", fotogrammi: 0, persone: [], sconosciuti: 0 };
  }
  // Senza fotogrammi non si e' controllato niente: il video non esce.
  if (quadri.length === 0) return { esito: "non_disponibile", fotogrammi: 0, persone: [], sconosciuti: 0 };

  const rif = riferimenti.filter((r): r is Riferimento => Boolean(r));
  const misure: (MisuraSomiglianza | null)[] = [];
  for (const q of quadri) {
    const v = await dip.scan(q.png).catch(() => "unavailable" as const);
    if (v === "unavailable") return { esito: "non_disponibile", fotogrammi: misure.length, persone: [], sconosciuti: 0 };
    if (v === "regenerate") return { esito: "protetto", fotogrammi: misure.length + 1, persone: [], sconosciuti: 0, istanteProtetto: q.t };
    misure.push(rif.length ? await dip.misura(q.png, rif).catch(() => null) : null);
  }
  return { esito: "ok", fotogrammi: quadri.length, ...riassumi(misure, chiavi) };
}
