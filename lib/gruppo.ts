// ──────────────────────────────────────────────────────────────────────────
// SCENE DI GRUPPO (19/9/2026, metodo rifatto il 21/9). Il procedimento:
//  1. UNA scena con tutti i protagonisti, le foto SCELTE di ognuno
//     (lib/riferimenti-scelti) e l'ordine da sinistra a destra dichiarato;
//  2. la misura di ognuno (lib/identity-score);
//  3. solo chi non viene riconosciuto si ritocca, al massimo due volte, e il
//     ritocco si tiene solo se migliora.
// Il "un volto alla volta" a tappeto e' stato ABBANDONATO: serviva a rimediare
// a riferimenti incoerenti, ma ogni passaggio ridisegna tutta l'immagine. Banco
// del 21/9 (stessa scena, stessi riferimenti scelti): scena sola 94% e 85%, con
// due passaggi Gabriella non veniva nemmeno piu' riconosciuta e la pelle usciva
// maculata; col modello premium 91% e 80%; col vecchio ad alta fedelta' 73% e 61%.
// Il motore e' iniettato (genera): cosi' si prova senza spendere.
// ──────────────────────────────────────────────────────────────────────────

import { abbina, voltiIn, verdetto, type MisuraSomiglianza, type Riferimento } from "@/lib/identity-score";
import { MAX_PERSONE_GRUPPO } from "@/lib/gruppo-prezzi";
import { preferisci, type VerdettoQualita } from "@/lib/qualita";

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
  passaggi: number; // 1 = solo la scena; 2 o 3 = con i ritocchi mirati
  volti: number; // volti trovati nel primo scatto
  ripassato: string | null; // chi e' stato ritoccato (se qualcuno)
  qualita: VerdettoQualita | null; // il controllo qualita' dello scatto consegnato (null = non fatto)
}

// Esegue la scena di gruppo. riferimenti = impronte delle foto vere (una per protagonista,
// stesso ordine), servono a misurare; se mancano, i passaggi si fanno comunque.
export async function eseguiGruppo(opts: {
  scena: string;
  persone: Protagonista[];
  riferimenti: (Riferimento | null)[];
  genera: Genera;
  fotografia?: string | null;
  volti?: (png: Buffer) => Promise<{ x?: number; lato: number; desc: number[] }[]>;
  // Il controllo qualita' (lib/qualita), iniettato: nei test non c'e' rete.
  // Nei gruppi e' dove serve di piu': il difetto tipico e' la stessa faccia
  // copiata su due persone, e il 21/9 e' uscito proprio cosi'.
  giudica?: (png: Buffer) => Promise<VerdettoQualita | null>;
}): Promise<EsitoGruppo> {
  const { scena, persone, genera } = opts;
  const trova = opts.volti ?? voltiIn;
  if (persone.length < 2 || persone.length > MAX_PERSONE_GRUPPO) throw new Error("Una scena di gruppo va da 2 a 4 persone.");
  const k = fotoPerPersona(persone.length);
  let costo = 0;

  const rif = opts.riferimenti.filter((r): r is Riferimento => Boolean(r));
  const misura_ = async (png: Buffer): Promise<MisuraSomiglianza | null> => {
    if (!rif.length) return null;
    try { return abbina(await trova(png), rif); } catch { return null; }
  };
  const peggiore = (m: MisuraSomiglianza) => Math.max(...m.persone.map((p) => p.distanza ?? 9));

  // 1) LA SCENA, con le foto scelte di ognuno. Fino a due tentativi se manca
  //    qualche volto in quadro o se la scena non passa il controllo qualita'.
  //    Fra i due vince quella con tutti i volti; a parita', quella che passa.
  type Scena = { png: Buffer; trovati: number; qualita: VerdettoQualita | null };
  const completa = (c: Scena) => c.trovati >= persone.length;
  let scelta: Scena | null = null;
  for (let t = 0; t < 2; t++) {
    const r = await genera(promptScena(scena, persone, opts.fotografia), persone.flatMap((p) => p.foto.slice(0, k)));
    costo += r.costoCent;
    const volti = await trova(r.png).catch(() => []);
    const grandi = volti.filter((v) => v.lato >= 60);
    const c: Scena = { png: r.png, trovati: grandi.length, qualita: null };
    if (completa(c) && opts.giudica) c.qualita = await opts.giudica(r.png).catch(() => null);
    if (!scelta || (completa(c) !== completa(scelta) ? completa(c) : preferisci(c.qualita, scelta.qualita, c.trovati > scelta.trovati))) scelta = c;
    if (completa(c) && (c.qualita?.passa ?? true)) break;
  }
  if (!scelta) throw new Error("La scena di gruppo non e' uscita.");
  let corrente = scelta.png;
  const trovati = scelta.trovati;
  let qualita = scelta.qualita;

  let misura = await misura_(corrente);
  let passaggi = 1;
  let ripassato: string | null = null;

  // 2) SOLO CHI NON TORNA si rifa'. Banco del 21/9: con le foto di riferimento
  //    scelte, la scena da sola tiene 94% e 85%; rifacendo i volti a tappeto si
  //    scendeva a "volto non riconosciuto" e pelle impastata, perche' ogni
  //    passaggio ridisegna TUTTA l'immagine. Quindi al massimo due ritocchi
  //    mirati, e solo se la misura li chiede; si tiene la versione migliore.
  const MAX_RITOCCHI = 2;
  for (let n = 0; n < MAX_RITOCCHI && misura && !verdetto(misura).ok; n++) {
    const sotto = misura.persone
      .filter((p) => p.distanza == null || p.distanza > p.soglia)
      .sort((a, b) => (b.distanza ?? 9) - (a.distanza ?? 9))[0];
    const i = sotto ? persone.findIndex((p) => p.handle === sotto.chiave) : -1;
    if (i < 0) break;
    const r = await genera(promptPassaggio(i, persone.length), [corrente, ...persone[i].foto.slice(0, MAX_IMMAGINI - 1)]);
    costo += r.costoCent;
    passaggi++;
    const nuova = await misura_(r.png);
    // Il ritocco si tiene solo se migliora davvero la somiglianza E non rovina
    // la foto: un ritocco che fa somigliare di piu' ma rompe una mano no.
    if (nuova && peggiore(nuova) < peggiore(misura)) {
      const q = opts.giudica ? await opts.giudica(r.png).catch(() => null) : null;
      if (q && !q.passa && (qualita?.passa ?? true)) break;
      corrente = r.png;
      misura = nuova;
      qualita = q ?? qualita;
      ripassato = persone[i].handle;
    } else break;
  }

  return { png: corrente, misura, costoCent: costo, passaggi, volti: trovati, ripassato, qualita };
}
