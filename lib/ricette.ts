// ──────────────────────────────────────────────────────────────────────────
// LE RICETTE (27/9/2026, mockup B approvato da Morelz). Quando uno scatto ti
// piace lo salvi come ricetta: si tengono scena, luce, vestiti, formato, look,
// qualita' e regia, NON la persona. Poi la ricetta si riusa con chiunque del
// registro. I vestiti si tengono per posizione (il primo da sinistra, il
// secondo...), perche' la persona cambia e il posto resta.
// Modulo PURO: la pulizia di quello che arriva dal browser si prova da sola.
// ──────────────────────────────────────────────────────────────────────────

import { LIGHTS, FRAMINGS, EXPRESSIONS, POSES, validEnum } from "@/lib/studio-options";
import { MAX_VESTITI } from "@/lib/vestiti";

export const MAX_RICETTE = 40; // per persona
export const MAX_NOME_RICETTA = 60;
export const MAX_SCENA_RICETTA = 1200;
const LOOK = ["naturale", "editoriale", "cinema", "bn", "flash", "pellicola"] as const;
const FORMATI = ["verticale", "quadrato", "orizzontale"] as const;
const QUALITA = ["bozza", "alta", "massima"] as const;

export interface Ricetta {
  id: string;
  nome: string;
  scena: string;
  luce: string | null; // null = automatica
  vestiti: string[]; // per posizione, da sinistra
  formato: (typeof FORMATI)[number];
  look: (typeof LOOK)[number];
  qualita: (typeof QUALITA)[number];
  inquadratura: string | null;
  espressione: string | null;
  posa: string | null;
  certificate: string | null; // lo scatto da cui e' nata, per la miniatura
  created_at?: string;
}

export type RicettaNuova = Omit<Ricetta, "id" | "created_at">;

const riga = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
const tra = <T extends string>(lista: readonly T[], v: unknown, base: T): T => (typeof v === "string" && (lista as readonly string[]).includes(v) ? (v as T) : base);

/** Da quello che manda il browser a una ricetta sicura. null se manca la scena o il nome. */
export function ricettaPulita(b: unknown): RicettaNuova | null {
  const p = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  const nome = riga(p.nome, MAX_NOME_RICETTA);
  const scena = riga(p.scena, MAX_SCENA_RICETTA);
  if (!nome || scena.length < 3) return null;
  const vestiti = (Array.isArray(p.vestiti) ? p.vestiti : []).slice(0, 4).map((v) => riga(v, MAX_VESTITI));
  while (vestiti.length && !vestiti[vestiti.length - 1]) vestiti.pop();
  const cert = riga(p.certificate, 80);
  return {
    nome,
    scena,
    luce: validEnum(LIGHTS, p.luce),
    vestiti,
    formato: tra(FORMATI, p.formato, "verticale"),
    look: tra(LOOK, p.look, "naturale"),
    qualita: tra(QUALITA, p.qualita, "alta"),
    inquadratura: validEnum(FRAMINGS, p.inquadratura),
    espressione: validEnum(EXPRESSIONS, p.espressione),
    posa: validEnum(POSES, p.posa),
    certificate: /^[A-Za-z0-9_-]{6,80}$/.test(cert) ? cert : null,
  };
}

/** Un nome da proporre: le prime parole della scena, senza articoli in coda. */
export function nomeProposto(scena: string): string {
  const parole = riga(scena, 200).replace(/[.,;:!?].*$/, "").split(" ").filter(Boolean).slice(0, 5);
  while (parole.length > 1 && /^(di|a|da|in|con|su|per|tra|fra|il|lo|la|i|gli|le|un|una|e|del|della|al|alla|nel|nella)$/i.test(parole[parole.length - 1])) parole.pop();
  const n = parole.join(" ");
  return n ? n[0].toUpperCase() + n.slice(1) : "La mia ricetta";
}
