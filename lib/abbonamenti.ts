// IL VOLTO A NOLEGGIO (20/9/2026): un brand non compra dieci foto, si prende
// una persona del registro per un periodo. Entrate ricorrenti per Semblic e una
// royalty che per la persona vale davvero (decine di euro al mese, non centesimi).
//
// I numeri NON sono scritti a mano: il costo del motore arriva da splitEcho e da
// prezzoAnima, come in Crea e in /prezzi. Finche' i pagamenti non sono aperti il
// piano si richiede dal modulo contatti: nessuna promessa che non possiamo mantenere.

import { splitEcho } from "@/lib/wallet";
import { prezzoAnima } from "@/lib/engines/anima-prezzi";
import { QUOTA_PERSONA } from "@/lib/engines/anima-prezzi";

export interface Piano {
  id: string;
  nome: string;
  prezzoCents: number; // al mese
  foto: number; // foto in Alta compresa
  video: number; // video Standard da 5 secondi compresi
  per: string; // a chi serve
}

export const PIANI: Piano[] = [
  { id: "piccolo", nome: "Piccolo", prezzoCents: 4900, foto: 30, video: 1, per: "Un negozio, un locale, un profilo social da tenere vivo" },
  { id: "campagna", nome: "Campagna", prezzoCents: 14900, foto: 100, video: 5, per: "Una campagna stagionale, un e-commerce, un'agenzia con un cliente" },
  { id: "sempre-acceso", nome: "Sempre acceso", prezzoCents: 39900, foto: 300, video: 15, per: "Chi pubblica ogni giorno e vuole lo stesso volto tutto l'anno" },
];

export interface ContiPiano {
  costoCents: number; // quanto costa a noi il motore, al mese
  personaCents: number; // quanto va alla persona del registro
  semblicCents: number; // quanto resta a Semblic
}

// Stessa regola del resto del listino: sul ricarico, il 45% alla persona.
export function contiPiano(p: Piano): ContiPiano {
  const foto = splitEcho(null, "1024x1536", "high");
  const video = prezzoAnima("standard", 5);
  const costo = p.foto * foto.cost_cents + p.video * video.cost_cents;
  const ricarico = Math.max(0, p.prezzoCents - costo);
  const persona = Math.round(ricarico * QUOTA_PERSONA);
  return { costoCents: costo, personaCents: persona, semblicCents: ricarico - persona };
}

export function pianoPerId(id: string | undefined): Piano | undefined {
  return PIANI.find((p) => p.id === id);
}
