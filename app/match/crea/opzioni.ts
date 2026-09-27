// Opzioni della pagina Crea (flusso "una frase sola", 17/9/2026). Modulo puro:
// traduce le poche scelte che vede l'utente (look, formato, qualita', regia)
// nei parametri che /api/generate gia' valida su whitelist (lib/studio-options).
// Niente testo libero come parametro: solo valori dei cataloghi.

import { splitEcho } from "@/lib/wallet";
import type { CameraVal, ColorStyleVal, ExpressionVal, FramingVal, LensVal, LightVal } from "@/lib/studio-options";

export type FormatoVal = "verticale" | "quadrato" | "orizzontale";
export type QualitaVal = "bozza" | "alta" | "massima";

export interface Look {
  v: string;
  l: string;
  desc: string;
  colorStyle: ColorStyleVal;
  camera: CameraVal;
  lens: LensVal;
  // Anteprima del look sulla miniatura del volto (solo CSS, non e' il risultato).
  filtro: string;
}

// Sei look al posto di stile colore + macchina + ottica: ognuno e' una ricetta
// fotografica completa. La luce resta alla scena scritta dall'utente.
export const LOOKS: Look[] = [
  { v: "naturale", l: "Naturale", desc: "luce vera, colori fedeli", colorStyle: "naturale", camera: "full_frame", lens: "50mm", filtro: "none" },
  { v: "editoriale", l: "Editoriale", desc: "pulito, da rivista", colorStyle: "naturale", camera: "medio_formato", lens: "85mm", filtro: "contrast(1.08) saturate(0.85) brightness(1.05)" },
  { v: "cinema", l: "Cinema", desc: "caldo e contrastato", colorStyle: "cinematico", camera: "full_frame", lens: "35mm", filtro: "contrast(1.15) saturate(1.15) sepia(0.2)" },
  { v: "bn", l: "Bianco e nero", desc: "senza tempo", colorStyle: "bn", camera: "full_frame", lens: "50mm", filtro: "grayscale(1) contrast(1.12)" },
  { v: "flash", l: "Flash", desc: "sera, festa, riviste", colorStyle: "flash", camera: "full_frame", lens: "35mm", filtro: "brightness(1.12) contrast(1.3) saturate(1.1)" },
  { v: "pellicola", l: "Pellicola", desc: "grana e colori morbidi", colorStyle: "naturale", camera: "analogica", lens: "50mm", filtro: "sepia(0.35) saturate(0.8) contrast(0.95)" },
];

// La luce (27/9): prima la decideva solo la frase, e il motore copiava la luce
// frontale delle foto da studio. Ora si sceglie, e ogni scelta si vede subito
// sulla miniatura con un velo CSS che imita da dove arriva (non e' il risultato).
export interface Luce {
  v: LightVal | "auto";
  l: string;
  desc: string;
  velo: string; // background del velo sopra la miniatura
  filtro?: string;
}
export const LUCI: Luce[] = [
  { v: "auto", l: "Automatica", desc: "la decide la scena", velo: "none" },
  { v: "morbida", l: "Finestra", desc: "morbida, da un lato", velo: "linear-gradient(90deg, rgba(255,246,230,0.28) 0%, transparent 45%, rgba(10,8,6,0.35) 100%)" },
  { v: "golden", l: "Golden hour", desc: "calda, bassa", velo: "linear-gradient(120deg, rgba(255,170,70,0.42) 0%, rgba(255,120,40,0.12) 55%, rgba(40,20,10,0.3) 100%)" },
  { v: "taglio_destra", l: "Di taglio da destra", desc: "metà volto in ombra", velo: "linear-gradient(90deg, rgba(5,4,3,0.88) 0%, rgba(5,4,3,0.7) 42%, rgba(5,4,3,0.05) 62%, rgba(255,250,240,0.12) 100%)", filtro: "contrast(1.25)" },
  { v: "taglio_sinistra", l: "Di taglio da sinistra", desc: "metà volto in ombra", velo: "linear-gradient(270deg, rgba(5,4,3,0.88) 0%, rgba(5,4,3,0.7) 42%, rgba(5,4,3,0.05) 62%, rgba(255,250,240,0.12) 100%)", filtro: "contrast(1.25)" },
  { v: "cupa", l: "Cupa", desc: "quasi tutto nel buio", velo: "radial-gradient(60% 55% at 55% 32%, transparent 0%, rgba(4,3,2,0.55) 55%, rgba(4,3,2,0.92) 100%)", filtro: "contrast(1.3) brightness(0.8)" },
  { v: "dall_alto", l: "Dall'alto", desc: "ombre sotto gli occhi", velo: "linear-gradient(180deg, rgba(255,250,240,0.18) 0%, transparent 30%, rgba(5,4,3,0.7) 100%)", filtro: "contrast(1.2)" },
  { v: "controluce", l: "Controluce", desc: "bordo di luce", velo: "radial-gradient(70% 60% at 50% 0%, rgba(255,240,210,0.55) 0%, transparent 60%), linear-gradient(0deg, rgba(10,8,6,0.45), transparent)" },
  { v: "neon", l: "Neon", desc: "notte, colori freddi", velo: "linear-gradient(110deg, rgba(255,40,160,0.45) 0%, transparent 45%, rgba(40,120,255,0.5) 100%)", filtro: "contrast(1.15) saturate(1.2)" },
  { v: "studio", l: "Studio", desc: "pulita e uniforme", velo: "linear-gradient(0deg, rgba(255,255,255,0.1), rgba(255,255,255,0.1))", filtro: "brightness(1.06)" },
];

// Spunti per i vestiti: riempiono il campo, poi si cambia quello che si vuole.
export const SPUNTI_VESTITI = [
  "giubbotto di pelle nera, maglietta bianca",
  "abito da sera nero lungo",
  "camicia di lino bianca, collo aperto",
  "felpa oversize grigia e jeans",
  "tailleur color sabbia",
  "tuta da lavoro blu con le maniche arrotolate",
];

export const FORMATI: { v: FormatoVal; l: string; desc: string }[] = [
  { v: "verticale", l: "Verticale", desc: "post e storie" },
  { v: "quadrato", l: "Quadrato", desc: "feed e catalogo" },
  { v: "orizzontale", l: "Orizzontale", desc: "banner e sito" },
];

// Misure valide per ECHO (lib/engines/echo ECHO_SIZES). Il quadrato non ha 4K.
const MISURE: Record<FormatoVal, { standard: string; massima: string }> = {
  verticale: { standard: "1024x1536", massima: "2160x3840" },
  quadrato: { standard: "1024x1024", massima: "2048x2048" },
  orizzontale: { standard: "1536x1024", massima: "3840x2160" },
};

export interface Qualita {
  v: QualitaVal;
  l: string;
  desc: string;
  size: string;
  quality: "medium" | "high";
  volt: number;
  royaltyCents: number;
}

// Tre livelli invece di risoluzione x qualita' (nove combinazioni). Il prezzo
// arriva dalla stessa funzione del server: quello che si vede e' quello che si paga.
export function qualitaPer(formato: FormatoVal): Qualita[] {
  const m = MISURE[formato];
  const grande = formato === "quadrato" ? "2K" : "4K";
  const defs: Omit<Qualita, "volt" | "royaltyCents">[] = [
    { v: "bozza", l: "Bozza veloce", desc: "per provare idee", size: m.standard, quality: "medium" },
    { v: "alta", l: "Alta", desc: "massimo dettaglio", size: m.standard, quality: "high" },
    { v: "massima", l: `Stampa ${grande}`, desc: "stampa e schermi grandi", size: m.massima, quality: "high" },
  ];
  return defs.map((d) => {
    const s = splitEcho(null, d.size, d.quality);
    return { ...d, volt: s.gross_cents, royaltyCents: s.net_cents };
  });
}

// Regia fine: tutto facoltativo. "auto" = non si manda niente, decide la scena.
export const INQUADRATURE: { v: FramingVal | "auto"; l: string }[] = [
  { v: "auto", l: "Automatica" },
  { v: "primo_piano", l: "Primo piano" },
  { v: "mezzo_busto", l: "Mezzo busto" },
  { v: "americano", l: "Piano americano" },
  { v: "figura_intera", l: "Figura intera" },
];

export const ESPRESSIONI: { v: ExpressionVal | "auto"; l: string }[] = [
  { v: "auto", l: "Automatica" },
  { v: "sorriso", l: "Sorriso" },
  { v: "serio", l: "Serio" },
  { v: "pensieroso", l: "Pensieroso" },
  { v: "risata", l: "Risata" },
];

export const POSE: { v: string; l: string }[] = [
  { v: "nessuna", l: "Automatica" },
  { v: "casuale", l: "Spontanea" },
  { v: "tre_quarti", l: "Tre quarti" },
  { v: "camminata", l: "Mentre cammina" },
  { v: "mani_tasca", l: "Mani in tasca" },
  { v: "braccia_conserte", l: "Braccia conserte" },
  { v: "al_muro", l: "Al muro" },
  { v: "profilo", l: "Di profilo" },
  { v: "di_spalle", l: "Di spalle" },
  { v: "sgabello", l: "Su uno sgabello" },
  { v: "prodotto_mano", l: "Prodotto in mano" },
];

export interface Idea {
  l: string;
  testo: string;
  formato: FormatoVal;
  look: string;
  inquadratura?: FramingVal;
  posa?: string;
  luce?: LightVal;
  vestiti?: string;
}

// Punti di partenza: riempiono la frase e le scelte, poi l'utente cambia cio' che vuole.
export const IDEE: Idea[] = [
  { l: "Post Instagram", testo: "in una caffetteria luminosa al mattino, maglione chiaro, luce morbida dalla finestra, sorriso spontaneo", formato: "verticale", look: "naturale" },
  { l: "Ritratto LinkedIn", testo: "ritratto professionale su sfondo chiaro e pulito, giacca scura, sguardo sicuro in camera", formato: "verticale", look: "editoriale", inquadratura: "primo_piano" },
  { l: "Foto prodotto", testo: "tiene il prodotto in mano all'altezza del viso, sfondo da studio pulito, luce uniforme", formato: "quadrato", look: "editoriale", posa: "prodotto_mano" },
  { l: "Campagna", testo: "cammina in centro città al tramonto, giacca di lino chiara, luce dorata tra i palazzi", formato: "orizzontale", look: "cinema", posa: "camminata" },
  { l: "Editoriale moda", testo: "su una terrazza di cemento a mezzogiorno, ombre nette", formato: "verticale", look: "bn", vestiti: "abito nero minimale" },
  { l: "Noir", testo: "in un capannone vuoto di notte, fumo leggero nell'aria, sguardo intenso in camera", formato: "orizzontale", look: "cinema", luce: "taglio_destra", vestiti: "giubbotto di pelle nera, maglietta bianca" },
  { l: "Notte in città", testo: "sotto le insegne di un vicolo di Tokyo dopo la pioggia, asfalto bagnato che riflette le luci", formato: "verticale", look: "cinema", luce: "neon" },
];

// Guardia fotorealismo: ECHO fa fotografie. Termini da illustrazione fanno
// perdere l'identita' del volto (e sprecano uno scatto): lo diciamo prima.
const NON_FOTO = [
  "anime", "manga", "cartoon", "cartone", "fumetto", "comic", "comics",
  "illustrazione", "illustration", "disegno", "drawing", "sketch", "schizzo",
  "dipinto", "painting", "pittura", "acquerello", "watercolor",
  "render", "3d", "pixar", "disney", "pixel", "low poly", "lowpoly",
  "caricatura", "caricature", "statua", "scultura", "origami", "lego",
  "plastilina", "claymation", "cel shading", "cel-shading", "voxel",
];
export function terminiNonFoto(scena: string): string[] {
  const s = " " + scena.toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
  return NON_FOTO.filter((t) => s.includes(" " + t + " "));
}

// Ruoli dei riferimenti, come li accetta il server (lib/echo-prompt).
export const RUOLI: { v: string; l: string }[] = [
  { v: "outfit", l: "Capo" },
  { v: "sfondo", l: "Luogo" },
  { v: "oggetto", l: "Oggetto" },
  { v: "accessorio", l: "Accessorio" },
];

// Ridimensiona l'immagine scelta a max 1024 px (data-URL JPEG): leggera da inviare.
export function ridimensiona(file: File, max = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * k));
      c.height = Math.max(1, Math.round(img.height * k));
      const ctx = c.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src = url;
  });
}

// "Gabriella", "Gabriella e Stella", "Gabriella, Stella e Marco"
export function nomi(lista: string[]): string {
  if (lista.length <= 1) return lista[0] ?? "";
  return `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}`;
}
