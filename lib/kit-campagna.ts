// ──────────────────────────────────────────────────────────────────────────
// KIT CAMPAGNA (21/9/2026). Da UNO scatto certificato tiriamo fuori, in un clic,
// i quattro tagli che servono davvero a pubblicare — post quadrato, post
// verticale, storia/reel, banner — piu' l'originale e la liberatoria scritta.
//
// Nessuna generazione nuova: sono ritagli dello stesso file, quindi non costa
// un centesimo di motore e la persona nella foto resta la stessa.
//
// Il ritaglio lo decidono I VOLTI, non l'algoritmo generico di sharp: provato il
// 21/9 col criterio "attention", il banner 16:9 teneva il libro e la tazzina e
// tagliava via la testa. Qui si trovano i volti (face-api, lo stesso motore che
// misura la somiglianza), si prende il rettangolo che li contiene tutti e si
// incornicia lasciando aria sopra la testa, come farebbe un fotografo.
//
// Ogni taglio esce in PNG con il certificato NASCOSTO nei pixel e scritto nei
// metadati: qualunque file del kit si carichi su Sigil, dice chi c'e' dentro e
// cosa ha autorizzato. In JPEG la filigrana invisibile non sopravvive, per
// questo il kit e' tutto PNG. SERVER-ONLY.
// ──────────────────────────────────────────────────────────────────────────

import sharp from "sharp";
import { embedStego } from "@/lib/stegano";
import { creaZip, type VoceZip } from "@/lib/zip";

export interface Riquadro { x: number; y: number; w: number; h: number }

export interface Formato {
  nome: string; // nome del file dentro lo zip
  larghezza: number;
  altezza: number;
  a_cosa_serve: string;
}

export const FORMATI: Formato[] = [
  { nome: "post-quadrato-1080x1080.png", larghezza: 1080, altezza: 1080, a_cosa_serve: "Post quadrato (Instagram, Facebook, LinkedIn)" },
  { nome: "post-verticale-1080x1350.png", larghezza: 1080, altezza: 1350, a_cosa_serve: "Post verticale 4:5, quello che prende piu' schermo nel feed" },
  { nome: "storia-1080x1920.png", larghezza: 1080, altezza: 1920, a_cosa_serve: "Storia e Reel a schermo intero 9:16 (anche TikTok)" },
  { nome: "banner-1920x1080.png", larghezza: 1920, altezza: 1080, a_cosa_serve: "Banner orizzontale 16:9 (sito, YouTube, presentazioni)" },
];

export interface DatiKit {
  certificato: string;
  scena: string;
  quando: string; // ISO
  persone: { alias: string; handle: string; somiglianza: number | null }[];
  verifyUrl: string;
}

// La liberatoria in chiaro, quella che un cliente allega alla campagna.
export function liberatoria(d: DatiKit): string {
  const chi = d.persone.map((p) => `  · ${p.alias} (semblic.com/passport/${p.handle})${p.somiglianza != null ? ` — somiglianza misurata ${p.somiglianza}%` : ""}`).join("\n");
  const data = new Date(d.quando).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
  return [
    "SEMBLIC — LIBERATORIA E PROVA DI CONSENSO",
    "=========================================",
    "",
    `Certificato: ${d.certificato}`,
    `Data: ${data}`,
    `Scena richiesta: ${d.scena}`,
    "",
    "PERSONE NELL'IMMAGINE",
    chi || "  · (nessuna persona registrata)",
    "",
    "COSA DICE QUESTO DOCUMENTO",
    "Le persone qui sopra sono persone reali, iscritte al registro Semblic con",
    "documento verificato. Al momento di questa generazione avevano dato un si'",
    "esplicito all'uso commerciale del proprio volto, e ognuna ha ricevuto la",
    "propria quota su questo utilizzo.",
    "",
    "COSA PUOI FARE",
    "Usare queste immagini nella tua comunicazione, anche a pagamento: social,",
    "sito, stampa, inserzioni. Il diritto e' tuo per l'uso, non l'identita' della",
    "persona: non puoi far dire o fare a questo volto cose che non ha autorizzato,",
    "ne' sostenere che la persona appoggia un prodotto o un'idea se non c'e' un",
    "accordo a parte.",
    "",
    "SE LA PERSONA CAMBIA IDEA",
    "La revoca vale per il futuro: da quel momento non si generano piu' contenuti",
    "con quel volto. Le immagini gia' consegnate come questa restano tue e restano",
    "verificabili, ma la correttezza vuole che una campagna nuova non parta con un",
    "volto che si e' ritirato.",
    "",
    "COME SI VERIFICA",
    `Carica uno qualsiasi dei file di questo kit su ${d.verifyUrl}: il certificato`,
    "e' nascosto dentro i pixel e scritto nei metadati. Nessun file viene caricato",
    "da nessuna parte: il controllo avviene nel tuo browser.",
    "",
    "I FILE DI QUESTO KIT",
    ...FORMATI.map((f) => `  · ${f.nome} — ${f.a_cosa_serve}`),
    "  · originale.png — lo scatto come e' uscito, alla massima risoluzione",
    "  · liberatoria.txt — questo documento",
    "",
    "Semblic — il registro dei volti consenzienti · semblic.com",
  ].join("\n");
}

// Dove stanno i volti nel quadro. Se il riconoscitore non c'e' o non trova
// nessuno, torna lista vuota e il ritaglio va per regola fotografica.
export async function voltiConRiquadro(img: Buffer): Promise<Riquadro[]> {
  try {
    const { loadFaceApi } = await import("@/lib/ward/matching/embed");
    const faceapi = await loadFaceApi();
    const { data, info } = await sharp(img).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const t = faceapi.tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);
    try {
      const dets: { box: { x: number; y: number; width: number; height: number } }[] =
        (await faceapi.detectAllFaces(t, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))).map(
          (d: { box: { x: number; y: number; width: number; height: number } }) => ({ box: d.box }),
        );
      return dets.map((d) => ({ x: d.box.x, y: d.box.y, w: d.box.width, h: d.box.height }));
    } finally {
      t.dispose();
    }
  } catch {
    return [];
  }
}

// IL RITAGLIO. Regole, nell'ordine:
//  1. il rettangolo piu' grande con le proporzioni giuste che sta nell'immagine;
//  2. lo si centra sui volti in orizzontale;
//  3. in verticale si lascia aria sopra: gli occhi finiscono attorno al primo
//     terzo, che e' dove l'occhio di chi guarda li cerca;
//  4. se i volti non ci stanno tutti, si allarga finche' ci stanno (o finche'
//     l'immagine finisce): meglio un taglio storto che una testa mozzata.
export function riquadroTaglio(W: number, H: number, tw: number, th: number, volti: Riquadro[]): Riquadro {
  const r = tw / th;
  const w = Math.min(W, Math.round(H * r));
  const h = Math.min(H, Math.round(W / r));
  const cw = W / H > r ? w : W;
  const ch = W / H > r ? H : h;

  if (!volti.length) {
    // Senza volti: centro in orizzontale, un po' in alto in verticale.
    return { x: Math.round((W - cw) / 2), y: Math.round(Math.min(H - ch, (H - ch) * 0.25)), w: cw, h: ch };
  }

  const x0 = Math.min(...volti.map((v) => v.x));
  const x1 = Math.max(...volti.map((v) => v.x + v.w));
  const y0 = Math.min(...volti.map((v) => v.y));
  const y1 = Math.max(...volti.map((v) => v.y + v.h));
  const cx = (x0 + x1) / 2;

  let x = Math.round(cx - cw / 2);
  // I volti stanno nel primo terzo dell'inquadratura, con un margine sopra la testa.
  let y = Math.round(y0 - Math.max(ch * 0.12, (y1 - y0) * 0.35));

  // Se qualcosa resta fuori, si trascina il riquadro finche' rientra.
  if (x > x0) x = Math.round(x0);
  if (x + cw < x1) x = Math.round(x1 - cw);
  if (y > y0) y = Math.round(y0);
  if (y + ch < y1) y = Math.round(y1 - ch);

  return { x: Math.max(0, Math.min(W - cw, x)), y: Math.max(0, Math.min(H - ch, y)), w: cw, h: ch };
}

// Un taglio: incornicia sui volti, poi rimette il certificato nei pixel e nei metadati.
async function taglio(originale: Buffer, f: Formato, d: DatiKit, volti: Riquadro[]): Promise<Buffer> {
  const meta = await sharp(originale).metadata();
  const W = meta.width ?? f.larghezza;
  const H = meta.height ?? f.altezza;
  const q = riquadroTaglio(W, H, f.larghezza, f.altezza, volti);
  const ritagliato = await sharp(originale)
    .extract({ left: q.x, top: q.y, width: q.w, height: q.h })
    .resize({ width: f.larghezza, height: f.altezza, fit: "fill" })
    .png()
    .toBuffer();
  const marcato = await embedStego(ritagliato, d.certificato);
  const desc = `Generato via Semblic con consenso. ${d.persone.map((p) => p.alias).join(", ")}. Certificato: ${d.certificato}. Verifica: ${d.verifyUrl}`;
  try {
    return await sharp(marcato)
      .withExif({ IFD0: { ImageDescription: desc, Copyright: "Semblic: contenuto certificato, persona reale consenziente", Artist: d.persone.map((p) => p.alias).join(", "), Software: "Semblic" } })
      .png()
      .toBuffer();
  } catch {
    return marcato; // i metadati sono un di piu': la filigrana invisibile c'e' gia'
  }
}

// Il kit completo. `originale` e' il PNG gia' certificato (quello che il cliente
// scarica oggi): lo mettiamo dentro tale e quale.
export async function kitCampagna(originale: Buffer, d: DatiKit): Promise<Buffer> {
  const volti = await voltiConRiquadro(originale); // una volta sola, vale per tutti i tagli
  const voci: VoceZip[] = [];
  for (const f of FORMATI) {
    voci.push({ nome: f.nome, dati: await taglio(originale, f, d, volti) });
  }
  voci.push({ nome: "originale.png", dati: originale });
  voci.push({ nome: "liberatoria.txt", dati: Buffer.from(liberatoria(d), "utf8") });
  return creaZip(voci, new Date(d.quando));
}
