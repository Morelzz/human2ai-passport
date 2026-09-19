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
      "ruolo": "chi e' nella scena, 2-5 parole in italiano, con il genere e le parole della frase (\"due amiche\" -> \"amica\", non \"amico\")",
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

export function scegliVolti(lettura: LetturaScena, candidati: Candidato[], giaPresi: Iterable<string> = []): Scelta[] {
  const presi = new Set<string>(giaPresi);
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

// ── Persone chieste per nome, e il volto gia' scelto ──────────────────────────
// "Gabriella e Stella che brindano al bar": se nella frase c'e' il nome di una
// persona del registro scritto con la maiuscola, si usa proprio lei. La
// maiuscola serve perche' "stella" o "random" sono anche parole comuni.

function senzaAccenti(t: string): string {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function nomiNellaScena(scena: string, candidati: Candidato[]): Candidato[] {
  const testo = senzaAccenti(scena);
  const trovati: { c: Candidato; pos: number }[] = [];
  for (const c of candidati) {
    const alias = senzaAccenti(c.alias.trim());
    if (alias.length < 3) continue;
    // alias intero ("Luca Agnelli") o solo il nome ("Luca"), a parola intera e con la maiuscola
    const forme = [...new Set([alias, alias.split(/\s+/)[0]])].filter((f) => f.length >= 3 && /^\p{Lu}/u.test(f));
    let pos = -1;
    for (const f of forme) {
      const re = new RegExp(`(^|[^\\p{L}])${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^\\p{L}])`, "u");
      const m = re.exec(testo);
      if (m) { pos = m.index; break; }
    }
    if (pos >= 0) trovati.push({ c, pos });
  }
  // nell'ordine in cui compaiono nella frase; uno solo per nome ripetuto fra due persone
  trovati.sort((a, b) => a.pos - b.pos);
  const visti = new Set<string>();
  return trovati.filter((t) => (visti.has(t.c.alias) ? false : (visti.add(t.c.alias), true))).map((t) => t.c).slice(0, MAX_PROTAGONISTI);
}

// Assegna le persone fisse (il volto gia' scelto, poi quelle chieste per nome)
// ai ruoli letti nella scena, e sceglie dal registro solo per i ruoli restanti.
// Una persona fissa prende il ruolo che le somiglia di piu' (o quello che la
// nomina); se la lettura ha meno ruoli delle persone fisse, se ne aggiungono.
export function scegliConFissi(lettura: LetturaScena, candidati: Candidato[], fissi: Candidato[]): Scelta[] {
  const unici = fissi.filter((f, i) => fissi.findIndex((x) => x.handle === f.handle) === i).slice(0, MAX_PROTAGONISTI);
  if (unici.length === 0) return scegliVolti(lettura, candidati);
  const ruoli = [...lettura.persone];
  const assegnati = new Map<number, Candidato>();
  for (const f of unici) {
    let migliore = -1;
    let punti = -Infinity;
    ruoli.forEach((r, i) => {
      if (assegnati.has(i)) return;
      const { ruolo, ...attrs } = r;
      const nomina = senzaAccenti(ruolo.toLowerCase()).includes(senzaAccenti(f.alias.toLowerCase().split(/\s+/)[0]));
      const v = scoreAvatar(f, attrs);
      // Chi e' stato scelto o chiamato per nome vale piu' dei dettagli indovinati
      // dalla lettura: prende un ruolo della scena, meglio se del suo genere.
      const genereOk = !attrs.gender || attrs.gender === f.gender;
      const p = (nomina ? 1000 : 0) + (v.allowed ? 100 + v.score : 0) + (genereOk ? 10 : 1);
      if (p > punti) { punti = p; migliore = i; }
    });
    if (migliore >= 0) assegnati.set(migliore, f);
    else if (ruoli.length < MAX_PROTAGONISTI) {
      ruoli.push({ ruolo: f.alias, gender: null, ethnicity: null, hair_color: null, age_min: null, age_max: null, eye_color: null, height: null, body_type: null });
      assegnati.set(ruoli.length - 1, f);
    }
  }
  const restanti = ruoli.map((r, i) => ({ r, i })).filter((x) => !assegnati.has(x.i));
  const altre = scegliVolti({ persone: restanti.map((x) => x.r), folla: lettura.folla }, candidati, unici.map((f) => f.handle));
  // Il volto gia' scelto resta il primo da sinistra, poi l'ordine della scena.
  const tutte = ruoli.map((r, i) => {
    const f = assegnati.get(i);
    if (f) return { i, s: { ruolo: r.ruolo, handle: f.handle, alias: f.alias, corrispondenza: "esatto" as const, differenze: [], alternative: [] } };
    return { i, s: altre[restanti.findIndex((x) => x.i === i)] };
  });
  const primo = unici[0].handle;
  tutte.sort((a, b) => (a.s.handle === primo ? -1 : b.s.handle === primo ? 1 : a.i - b.i));
  return tutte.map((x) => x.s).slice(0, MAX_PROTAGONISTI);
}
