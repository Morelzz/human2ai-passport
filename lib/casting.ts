import Anthropic from "@anthropic-ai/sdk";
import { scoreAvatar, specifiedCount, type PromptAttributes, type ScorableAvatar } from "@/lib/matching";

// ──────────────────────────────────────────────────────────────────────────
// CASTING AUTOMATICO (19/9/2026, idea di Morelz). Chi crea scrive solo la scena
// ("una ragazza bionda che corre in un campo"): Semblic legge chi c'e' nella
// scena e sceglie dal registro, per ogni persona, un volto reale con il
// consenso giusto. La scelta e' invisibile, il risultato no: lo scatto dice
// chi c'e' (certificato, ricevuta e royalty sono legati a una persona).
// Regole: mai inventare una persona che nel registro non c'e'; fra volti
// ugualmente adatti si sceglie chi e' stato usato meno, cosi' le royalty girano.
// ──────────────────────────────────────────────────────────────────────────

export const MAX_PROTAGONISTI = 4;

export interface PersonaInScena extends PromptAttributes {
  ruolo: string; // chi e' nella scena, in poche parole ("la ragazza che corre")
}

export interface LetturaScena {
  persone: PersonaInScena[];
  folla: boolean; // la scena chiede altra gente sullo sfondo, non riconoscibile
}

const SISTEMA = `Leggi la scena che un cliente vuole fotografare e dimmi CHI ci deve essere.
Rispondi SOLO con JSON valido:
{
  "persone": [
    {
      "ruolo": "chi e' nella scena, 2-5 parole in italiano",
      "gender": "uomo" | "donna" | null,
      "ethnicity": stringa breve in italiano | null,
      "hair_color": "neri"|"castani"|"biondi"|"rossi"|"grigi"|"rasati" | null,
      "age_min": numero | null,
      "age_max": numero | null,
      "eye_color": "marroni"|"neri"|"azzurri"|"verdi"|"grigi"|"nocciola" | null,
      "height": "bassa"|"media"|"alta" | null,
      "body_type": "slim"|"atletico"|"normale"|"curvy"|"robusto" | null
    }
  ],
  "folla": true | false
}
Regole:
- "persone" sono solo i PROTAGONISTI riconoscibili, al massimo 4, UNA VOCE PER PERSONA.
- Un gruppo va sempre scomposto in persone separate. Senza numero ("un gruppo di amici") sono 3 voci.
  Esempio: "due ragazze e un ragazzo al bar" = 3 voci (donna, donna, uomo). "un gruppo di ragazzi" = 3 voci
  con gender null se il gruppo e' misto o non e' chiaro ("ragazzi" puo' essere misto), eta' 18-28.
- Le comparse di sfondo (pubblico, passanti, clienti del bar) NON sono persone: metti "folla": true.
- Se la scena non ha persone (un paesaggio, un prodotto da solo) restituisci "persone": [].
- "ragazza/ragazzo" = 18-28, "giovane" = 20-30, "adulto" = 30-45, "maturo" = 45-60, "anziano" = 60+.
- Estrai solo cio' che e' scritto o evidente. Niente attributi inventati: meglio null.`;

function pulisci(p: Record<string, unknown>): PersonaInScena {
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().toLowerCase() : null);
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
  return {
    ruolo: typeof p.ruolo === "string" && p.ruolo.trim() ? p.ruolo.trim().slice(0, 60) : "protagonista",
    gender: p.gender === "uomo" || p.gender === "donna" ? p.gender : null,
    ethnicity: s(p.ethnicity),
    hair_color: s(p.hair_color),
    age_min: n(p.age_min),
    age_max: n(p.age_max),
    eye_color: s(p.eye_color),
    height: s(p.height),
    body_type: s(p.body_type),
  };
}

export function interpretaRisposta(testo: string): LetturaScena {
  const json = testo.replace(/^```json?/i, "").replace(/```$/, "").trim();
  const j = JSON.parse(json) as { persone?: unknown; folla?: unknown };
  const persone = Array.isArray(j.persone) ? j.persone.slice(0, MAX_PROTAGONISTI).map((p) => pulisci((p ?? {}) as Record<string, unknown>)) : [];
  return { persone, folla: j.folla === true };
}

export async function leggiScena(scena: string): Promise<LetturaScena> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: SISTEMA,
    messages: [{ role: "user", content: scena.slice(0, 1500) }],
  });
  const testo = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
  return interpretaRisposta(testo);
}

export type Candidato = ScorableAvatar & { handle: string; alias: string; usage_count?: number | null };

export interface Scelta {
  ruolo: string;
  handle: string | null;
  alias: string | null;
  // "esatto" = rispetta tutto cio' che la scena chiede; "vicino" = il piu' simile,
  // ma qualcosa non combacia (lo diciamo e chiediamo); null = nessuno adatto.
  corrispondenza: "esatto" | "vicino" | null;
  differenze: string[];
  alternative: string[]; // altri handle adatti, per "cambia persona"
}

// Allentamenti in ordine: prima i dettagli, mai il genere.
const ALLENTA: (keyof PromptAttributes)[] = ["body_type", "height", "eye_color", "age_min", "ethnicity", "hair_color"];
const NOMI: Record<string, string> = { body_type: "corporatura", height: "statura", eye_color: "occhi", age_min: "età", ethnicity: "provenienza", hair_color: "capelli" };

function adatti(attrs: PromptAttributes, candidati: Candidato[], presi: Set<string>) {
  return candidati
    .filter((c) => !presi.has(c.handle))
    .map((c) => ({ c, r: scoreAvatar(c, attrs) }))
    .filter((x) => x.r.allowed)
    // prima i piu' affini, poi chi e' stato usato meno (le royalty girano), poi a caso
    .sort((a, b) => b.r.score - a.r.score || (a.c.usage_count ?? 0) - (b.c.usage_count ?? 0) || Math.random() - 0.5);
}

export function scegliVolti(lettura: LetturaScena, candidati: Candidato[]): Scelta[] {
  const presi = new Set<string>();
  return lettura.persone.map((p) => {
    const { ruolo, ...attrs } = p;
    let lista = adatti(attrs, candidati, presi);
    let corrispondenza: Scelta["corrispondenza"] = lista.length ? "esatto" : null;
    const differenze: string[] = [];
    if (!lista.length && specifiedCount(attrs) > 0) {
      // Nessuno esatto: allento un criterio alla volta e dico quale.
      const prova: PromptAttributes = { ...attrs };
      for (const k of ALLENTA) {
        if (prova[k] == null) continue;
        (prova as unknown as Record<string, unknown>)[k] = null;
        if (k === "age_min") prova.age_max = null;
        differenze.push(NOMI[k]);
        lista = adatti(prova, candidati, presi);
        if (lista.length) { corrispondenza = "vicino"; break; }
      }
    }
    const scelto = lista[0]?.c ?? null;
    if (scelto) presi.add(scelto.handle);
    return {
      ruolo,
      handle: scelto?.handle ?? null,
      alias: scelto?.alias ?? null,
      corrispondenza: scelto ? corrispondenza : null,
      differenze: scelto && corrispondenza === "vicino" ? differenze : [],
      alternative: lista.slice(1, 4).map((x) => x.c.handle),
    };
  });
}
