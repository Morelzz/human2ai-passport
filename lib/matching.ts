import Anthropic from "@anthropic-ai/sdk";

// Attributi di IDENTITÀ estratti dal prompt del compratore.
// NB: la categoria d'uso NON viene più inferita dal testo (inquinava il match):
// arriva come scelta esplicita dal menu, vedi /api/match.
export interface PromptAttributes {
  gender: "uomo" | "donna" | null;
  ethnicity: string | null;
  hair_color: string | null;
  age_min: number | null;
  age_max: number | null;
  // Filtri avanzati (stesso vocabolario di IDENTITY_KIT in lib/types.ts)
  eye_color: string | null;
  height: string | null;
  body_type: string | null;
}

// --- 1. Estrazione attributi via Claude API (solo identità) ---
export async function extractAttributes(prompt: string): Promise<PromptAttributes> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const system = `Sei un estrattore di attributi FISICI per un registro di volti umani.
Dato il prompt di un cliente che descrive la PERSONA che vuole generare,
estrai SOLO le caratteristiche identitarie e rispondi ESCLUSIVAMENTE con JSON valido, nient'altro:
{
  "gender": "uomo" | "donna" | null,
  "ethnicity": stringa breve in italiano (es. "giapponese","italiana","afroamericano") | null,
  "hair_color": stringa breve in italiano (es. "neri","castani","biondi","rossi","grigi","rasati") | null,
  "age_min": numero intero | null,
  "age_max": numero intero | null,
  "eye_color": "marroni"|"neri"|"azzurri"|"verdi"|"grigi"|"nocciola" | null,
  "height": "bassa"|"media"|"alta" | null,
  "body_type": "slim"|"atletico"|"normale"|"curvy"|"robusto" | null
}
Regole:
- Estrai SOLO attributi fisici della persona. IGNORA del tutto azioni, ambientazioni,
  scene o usi commerciali (es. "che balla in spiaggia", "per una campagna"): non sono identità.
- Se un attributo non è deducibile, usa null. NON inferire ciò che non è esplicito.
- "giovane" ~ 20-30, "adulto" ~ 30-45, "maturo/anziano" ~ 50+. Stima un range sensato.
- Per eye_color/height/body_type usa SOLO i valori elencati: mappa i sinonimi
  ("magra/snella" -> "slim", "in forma" -> "atletico", "formosa" -> "curvy").`;

  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const json = text.replace(/^```json?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(json) as PromptAttributes;

  return {
    gender: parsed.gender === "uomo" || parsed.gender === "donna" ? parsed.gender : null,
    ethnicity: parsed.ethnicity ? String(parsed.ethnicity).toLowerCase() : null,
    hair_color: parsed.hair_color ? String(parsed.hair_color).toLowerCase() : null,
    age_min: typeof parsed.age_min === "number" ? parsed.age_min : null,
    age_max: typeof parsed.age_max === "number" ? parsed.age_max : null,
    eye_color: parsed.eye_color ? String(parsed.eye_color).toLowerCase() : null,
    height: parsed.height ? String(parsed.height).toLowerCase() : null,
    body_type: parsed.body_type ? String(parsed.body_type).toLowerCase() : null,
  };
}

// --- 1b. Identikit strutturato (chip) -> attributi, senza chiamata AI ---
// Quando l'utente compila l'identikit cliccabile, gli attributi arrivano già puliti:
// normalizziamo senza scomodare Claude (deterministico, istantaneo, gratis).
export function normalizeIdentity(raw: unknown): PromptAttributes {
  const r = (raw ?? {}) as Record<string, unknown>;
  const gender = r.gender === "uomo" || r.gender === "donna" ? r.gender : null;
  const ethnicity = typeof r.ethnicity === "string" && r.ethnicity.trim() ? r.ethnicity.trim().toLowerCase() : null;
  const hair_color = typeof r.hair_color === "string" && r.hair_color.trim() ? r.hair_color.trim().toLowerCase() : null;
  const age_min = typeof r.age_min === "number" ? r.age_min : null;
  const age_max = typeof r.age_max === "number" ? r.age_max : null;
  const eye_color = typeof r.eye_color === "string" && r.eye_color.trim() ? r.eye_color.trim().toLowerCase() : null;
  const height = typeof r.height === "string" && r.height.trim() ? r.height.trim().toLowerCase() : null;
  const body_type = typeof r.body_type === "string" && r.body_type.trim() ? r.body_type.trim().toLowerCase() : null;
  return { gender, ethnicity, hair_color, age_min, age_max, eye_color, height, body_type };
}

// --- 2. Punteggio di affinità avatar vs attributi ---
export interface ScorableAvatar {
  gender: string | null;
  ethnicity: string | null;
  hair_color: string | null;
  age_range: string | null;
  eye_color?: string | null;
  height?: string | null;
  body_type?: string | null;
  // Consenso uso commerciale sì/no (modello senza categorie): è il gate.
  commercial_consent?: boolean;
}

export interface MatchResult {
  score: number;    // quanti attributi richiesti combaciano (per l'ordinamento)
  allowed: boolean; // true SOLO se l'avatar soddisfa TUTTI gli attributi richiesti
  reasons: string[];
}

function parseRange(range: string | null): [number, number] | null {
  if (!range) return null;
  const m = range.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10)];
}

export function fuzzyEq(a: string, b: string): boolean {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  return x === y || x.includes(y) || y.includes(x);
}

// Confronto etnia gender-insensitive: nel registro l'etnia è declinata
// ("italiano"/"italiana"), l'identikit è neutro. Togliamo accenti e la vocale
// finale di genere prima del confronto: "italiano" ~ "italiana" -> "italian".
function stemEthnic(s: string): string {
  return s.toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // toglie accenti
    .replace(/[aoe]$/, "");                            // toglie la vocale finale di genere
}
// Review D1 — gruppi etnico-geografici: il registro archivia NAZIONALITÀ
// ("italiana", "spagnola", "giapponese"…) ma il brief del buyer usa spesso
// gruppi più larghi ("mediterranea", "asiatica", "europea"). La richiesta di
// gruppo combacia con le nazionalità che contiene. Chiavi e valori in forma
// GIÀ stemmata (vedi stemEthnic). Il filtro resta rigido: nessuna inferenza,
// solo vocabolario allargato.
const ETHNIC_GROUPS: Record<string, string[]> = {
  mediterrane: ["italian", "spagnol", "grec", "portoghes"],
  europe: ["italian", "spagnol", "frances", "tedesc", "grec", "portoghes", "russ", "polacc", "caucasic"],
  caucasic: ["italian", "spagnol", "frances", "tedesc", "grec", "portoghes", "russ", "polacc", "europe"],
  asiatic: ["giappones", "cines", "corean", "vietnamit", "thailandes", "filippin"],
  "sud-asiatic": ["indian", "pakistan", "bengales", "cingales"],
  african: ["nigerian", "senegales", "ghanes", "etiop", "keniot"],
  latin: ["brasilian", "argentin", "messican", "colombian", "venezuelan", "perurian", "cilen"],
  medioriental: ["arab", "marocchin", "egizian", "tunisin", "libanes", "iranian", "turc"],
  arab: ["marocchin", "egizian", "tunisin", "libanes", "saudit", "medioriental"],
};

export function ethnicityEq(a: string, b: string): boolean {
  // a = etnia dell'avatar (registro), b = etnia richiesta (brief/filtri)
  const x = stemEthnic(a);
  const y = stemEthnic(b);
  if (x === y || x.includes(y) || y.includes(x)) return true;
  const group = ETHNIC_GROUPS[y];
  if (group?.some((g) => x === g || x.includes(g) || g.includes(x))) return true;
  // Simmetrico: il registro può archiviare il GRUPPO (IDENTITY_KIT, via
  // self-onboarding: "caucasico", "asiatico"…) e la richiesta una nazionalità
  // ("italiana", "giapponese") — il gruppo dell'avatar si espande verso la
  // richiesta. Solo allargamento: nessun caso vero diventa falso.
  const groupAv = ETHNIC_GROUPS[x];
  return Boolean(groupAv?.some((g) => y === g || y.includes(g) || g.includes(y)));
}

// Modello a filtro rigido: l'avatar è un match SOLO se soddisfa OGNI attributo
// esplicitamente richiesto. Gli attributi NON richiesti vengono ignorati del tutto
// (es. "uomo caucasico capelli neri" -> tutti, a prescindere dagli occhi/corporatura).
export function scoreAvatar(av: ScorableAvatar, attrs: PromptAttributes): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  // Gate del consenso (hard): senza consenso all'uso commerciale, nessun match.
  // Sostituisce il vecchio gate per-categoria: il consenso ora è sì/no (Fase 2),
  // non più dichiarato per singola categoria d'uso.
  if (av.commercial_consent === false) {
    return { score: 0, allowed: false, reasons: ["consenso all'uso commerciale non concesso"] };
  }

  if (attrs.gender) {
    if (!av.gender || av.gender !== attrs.gender) {
      return { score: 0, allowed: false, reasons: ["genere diverso"] };
    }
    score += 1;
    reasons.push("genere");
  }

  if (attrs.ethnicity) {
    if (!av.ethnicity || !ethnicityEq(av.ethnicity, attrs.ethnicity)) {
      return { score: 0, allowed: false, reasons: ["etnia diversa"] };
    }
    score += 1;
    reasons.push("etnia");
  }

  if (attrs.hair_color) {
    if (!av.hair_color || !fuzzyEq(av.hair_color, attrs.hair_color)) {
      return { score: 0, allowed: false, reasons: ["capelli diversi"] };
    }
    score += 1;
    reasons.push("capelli");
  }

  if (attrs.age_min != null && attrs.age_max != null) {
    const avRange = parseRange(av.age_range);
    const overlap = avRange && Math.min(avRange[1], attrs.age_max) >= Math.max(avRange[0], attrs.age_min);
    if (!overlap) {
      return { score: 0, allowed: false, reasons: ["età diversa"] };
    }
    score += 1;
    reasons.push("età");
  }

  // Filtri avanzati: stessa regola rigida (richiesto → deve combaciare).
  if (attrs.eye_color) {
    if (!av.eye_color || !fuzzyEq(av.eye_color, attrs.eye_color)) {
      return { score: 0, allowed: false, reasons: ["occhi diversi"] };
    }
    score += 1;
    reasons.push("occhi");
  }

  if (attrs.height) {
    if (!av.height || !fuzzyEq(av.height, attrs.height)) {
      return { score: 0, allowed: false, reasons: ["statura diversa"] };
    }
    score += 1;
    reasons.push("statura");
  }

  if (attrs.body_type) {
    if (!av.body_type || !fuzzyEq(av.body_type, attrs.body_type)) {
      return { score: 0, allowed: false, reasons: ["corporatura diversa"] };
    }
    score += 1;
    reasons.push("corporatura");
  }

  return { score, allowed: true, reasons };
}

// Numero di criteri identità esplicitamente richiesti. La categoria d'uso NON è
// più un criterio di matching (Fase 2): resta scelta dal buyer e registrata sulla
// generazione, ma non filtra il registro.
export function specifiedCount(attrs: PromptAttributes): number {
  let n = 0;
  if (attrs.gender) n++;
  if (attrs.ethnicity) n++;
  if (attrs.hair_color) n++;
  if (attrs.age_min != null && attrs.age_max != null) n++;
  if (attrs.eye_color) n++;
  if (attrs.height) n++;
  if (attrs.body_type) n++;
  return n;
}
