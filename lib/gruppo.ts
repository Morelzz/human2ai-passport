// ──────────────────────────────────────────────────────────────────────────
// SCENE DI GRUPPO "un volto alla volta" (19/9/2026). Provato su Higgsfield con
// Gabriella e Stella: in un colpo solo Stella usciva al 64%, rifacendo solo il
// suo volto con le sue foto e' salita all'82% (Gabriella ferma all'82%).
// Il procedimento:
//  1. la scena con tutti i protagonisti, poche foto per persona e l'ordine
//     da sinistra a destra dichiarato;
//  2. per ogni protagonista un passaggio che rifa' SOLO il suo volto con
//     tutte le sue foto vere (la posizione si legge dal primo scatto);
//  3. la misura di ognuno (lib/identity-score).
// Il motore e' iniettato (genera): cosi' si prova senza spendere.
// ──────────────────────────────────────────────────────────────────────────

import { abbina, voltiIn, verdetto, type MisuraSomiglianza, type Riferimento } from "@/lib/identity-score";
import { MAX_PERSONE_GRUPPO } from "@/lib/gruppo-prezzi";

export { MAX_PERSONE_GRUPPO, dividiRoyalty, prezzoGruppo } from "@/lib/gruppo-prezzi";
const MAX_IMMAGINI = 10; // limite del motore (gpt-image-2.5)

export interface Protagonista {
  avatarId: string;
  handle: string;
  alias: string;
  identityText: string | null; // es. "Italian woman, apparent age 18-25, ..."
  foto: Buffer[]; // foto vere e verificate (reference-set)
}

export type Genera = (prompt: string, immagini: Buffer[]) => Promise<{ png: Buffer; costoCent: number }>;

const ORDINALI = ["first", "second", "third", "fourth"];

export function fotoPerPersona(n: number): number {
  // 2 persone: 4 foto a testa; 3: 3; 4: 2 (limite del motore: 10 immagini)
  return Math.max(1, Math.min(4, Math.floor(MAX_IMMAGINI / n)));
}

// "The person is an Italian woman, apparent age 18-25. Their natural hair is blonde."
// -> "an Italian woman, apparent age 18-25, natural hair blonde"
export function descrizioneBreve(identityText: string | null): string | null {
  if (!identityText) return null;
  const t = identityText
    .replace(/^The person is\s+/i, "")
    .replace(/\.\s*Their natural hair is\s+/i, ", natural hair ")
    .replace(/\.\s*$/, "")
    .trim();
  return t || null;
}

export function promptScena(scena: string, persone: Protagonista[], fotografia?: string | null): string {
  const k = fotoPerPersona(persone.length);
  const chi = persone.map((p, i) => {
    const da = i * k + 1;
    const a = da + k - 1;
    const d = descrizioneBreve(p.identityText);
    return `Person ${i + 1} (${ORDINALI[i]} from the LEFT) is exactly the person in reference image${k > 1 ? `s ${da}-${a}` : ` ${da}`}${d ? `, ${d}` : ""}.`;
  }).join(" ");
  const pulita = scena.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
  return [
    `Photorealistic group photograph of exactly ${persone.length} people, standing or sitting side by side from left to right in this order. ${chi}`,
    "Each person keeps their own face, eyes, eyebrows, nose, lips, hairline, hairstyle around the face (fringe or bangs, parting) and distinctive features identical to their references.",
    "All faces large, sharp, fully visible and inside the frame, turned roughly toward the camera. Nobody else in the foreground; any background people far away, out of focus and not recognizable.",
    fotografia ? fotografia.trim() : "",
    `Scene: ${pulita}.`,
  ].filter(Boolean).join(" ");
}

export function promptPassaggio(posizione: number, totale: number): string {
  return [
    `Edit the FIRST image. It shows ${totale} people. Change ONLY the face of the person who is ${ORDINALI[posizione]} from the LEFT`,
    "so that it is exactly the same person as in all the other reference images: same face shape, eyes, eyebrows, nose, lips, jaw, hairline and hairstyle around the face (fringe or bangs, parting, hair colour), exactly as in those references.",
    "Keep that person's expression, head angle, pose, clothes and accessories, and keep every other person, the light and the background completely unchanged. Photorealistic.",
  ].join(" ");
}

export interface EsitoGruppo {
  png: Buffer;
  misura: MisuraSomiglianza | null;
  costoCent: number;
  passaggi: number;
  volti: number; // volti trovati nel primo scatto
  ripassato: string | null; // chiave della persona ripassata una seconda volta
}

// Esegue la scena di gruppo. riferimenti = impronte delle foto vere (una per protagonista,
// stesso ordine), servono a misurare; se mancano, i passaggi si fanno comunque.
export async function eseguiGruppo(opts: {
  scena: string;
  persone: Protagonista[];
  riferimenti: (Riferimento | null)[];
  genera: Genera;
  fotografia?: string | null;
  // modo "applica": se una persona resta sotto soglia si rifa' il suo volto una
  // volta e si tiene la versione migliore
  ripassa?: boolean;
  volti?: (png: Buffer) => Promise<{ x?: number; lato: number; desc: number[] }[]>;
}): Promise<EsitoGruppo> {
  const { scena, persone, genera } = opts;
  const trova = opts.volti ?? voltiIn;
  if (persone.length < 2 || persone.length > MAX_PERSONE_GRUPPO) throw new Error("Una scena di gruppo va da 2 a 4 persone.");
  const k = fotoPerPersona(persone.length);
  let costo = 0;

  // 1) la scena, fino a due tentativi per avere tutti i volti in quadro
  let corrente: Buffer | null = null;
  let trovati = 0;
  for (let t = 0; t < 2; t++) {
    const r = await genera(promptScena(scena, persone, opts.fotografia), persone.flatMap((p) => p.foto.slice(0, k)));
    costo += r.costoCent;
    const volti = await trova(r.png).catch(() => []);
    const grandi = volti.filter((v) => v.lato >= 60);
    corrente = r.png;
    trovati = grandi.length;
    if (grandi.length >= persone.length) break;
  }
  if (!corrente) throw new Error("La scena di gruppo non e' uscita.");

  // 2) un passaggio per protagonista, da sinistra a destra
  for (let i = 0; i < persone.length; i++) {
    const r = await genera(promptPassaggio(i, persone.length), [corrente, ...persone[i].foto.slice(0, MAX_IMMAGINI - 1)]);
    costo += r.costoCent;
    corrente = r.png;
  }

  // 3) misura di tutti
  const rif = opts.riferimenti.filter((r): r is Riferimento => Boolean(r));
  const misura_ = async (png: Buffer): Promise<MisuraSomiglianza | null> => {
    if (!rif.length) return null;
    try { return abbina(await trova(png), rif); } catch { return null; }
  };
  let misura = await misura_(corrente);
  let passaggi = persone.length;
  let ripassato: string | null = null;

  // 4) in "applica": la persona piu' lontana sotto soglia si ripassa una volta
  if (opts.ripassa && misura && !verdetto(misura).ok) {
    const sotto = misura.persone
      .filter((p) => p.distanza == null || p.distanza > p.soglia)
      .sort((a, b) => (b.distanza ?? 9) - (a.distanza ?? 9))[0];
    const i = sotto ? persone.findIndex((p) => p.handle === sotto.chiave) : -1;
    if (i >= 0) {
      const r = await genera(promptPassaggio(i, persone.length), [corrente, ...persone[i].foto.slice(0, MAX_IMMAGINI - 1)]);
      costo += r.costoCent;
      passaggi++;
      const nuova = await misura_(r.png);
      const peggiore = (m: MisuraSomiglianza) => Math.max(...m.persone.map((p) => p.distanza ?? 9));
      if (nuova && peggiore(nuova) < peggiore(misura)) {
        corrente = r.png;
        misura = nuova;
        ripassato = persone[i].handle;
      }
    }
  }
  return { png: corrente, misura, costoCent: costo, passaggi, volti: trovati, ripassato };
}
