// Le foto vere che vanno davvero al motore (21/9/2026). Non tutte: solo quelle
// coerenti fra loro (lib/scelta-riferimenti). Il motore fa una media dei
// riferimenti, quindi una foto "di un'altra persona" sporca il volto: misurato
// su Stella, 57% -> 76% di coerenza togliendo 3 foto su 8; su Gabriella 77% ->
// 91%. Le impronte servono anche a misurare lo scatto finito, quindi si
// calcolano una volta sola e si tengono in memoria un'ora (come prima).
// SERVER-ONLY.

import { getReferenceSet } from "@/lib/references";
import { voltiIn, coerenzaInterna, type Riferimento } from "@/lib/identity-score";
import { scegliRiferimenti } from "@/lib/scelta-riferimenti";

export interface RiferimentiScelti {
  foto: Buffer[]; // da mandare al motore, in ordine di coerenza
  riferimento: Riferimento | null; // impronte delle foto tenute, per misurare
  scartate: number;
  coerenza: number | null;
}

const cache = new Map<string, { v: RiferimentiScelti; at: number }>();
const ORA = 60 * 60 * 1000;

export async function riferimentiScelti(handle: string): Promise<RiferimentiScelti> {
  const foto = await getReferenceSet(handle);
  const k = `${handle}:${foto.length}`;
  const c = cache.get(k);
  if (c && Date.now() - c.at < ORA) return c.v;

  const desc: (number[] | null)[] = [];
  for (const f of foto) {
    try {
      const v = await voltiIn(f);
      desc.push(v.length ? v.sort((a, b) => b.lato - a.lato)[0].desc : null);
    } catch {
      desc.push(null); // misuratore non disponibile: la foto resta, non si butta niente
    }
  }
  const leggibili = desc.filter(Boolean).length;
  let v: RiferimentiScelti;
  if (leggibili === 0) {
    // Nessun volto letto (misuratore giu'): si va avanti con tutte, come prima.
    v = { foto, riferimento: null, scartate: 0, coerenza: null };
  } else {
    const s = scegliRiferimenti(desc);
    const tenute = s.tenute.map((i) => foto[i]);
    const rif = s.tenute.map((i) => desc[i]).filter((d): d is number[] => Boolean(d));
    v = {
      foto: tenute.length ? tenute : foto,
      riferimento: rif.length ? { chiave: handle, rif, coerenza: coerenzaInterna(rif) } : null,
      scartate: s.scartate.length,
      coerenza: s.coerenzaDopo,
    };
    if (s.scartate.length) {
      console.log(`[riferimenti] ${handle}: ${tenute.length} foto su ${foto.length} (coerenza ${s.coerenzaPrima?.toFixed(3)} -> ${s.coerenzaDopo?.toFixed(3)})`);
    }
  }
  cache.set(k, { v, at: Date.now() });
  return v;
}
