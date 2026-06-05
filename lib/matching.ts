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
  "age_max": numero intero | null
}
Regole:
- Estrai SOLO attributi fisici della persona. IGNORA del tutto azioni, ambientazioni,
  scene o usi commerciali (es. "che balla in spiaggia", "per una campagna"): non sono identità.
- Se un attributo non è deducibile, usa null. NON inferire ciò che non è esplicito.
- "giovane" ~ 20-30, "adulto" ~ 30-45, "maturo/anziano" ~ 50+. Stima un range sensato.`;

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
  };
}

// --- 2. Punteggio di affinità avatar vs attributi ---
export interface ScorableAvatar {
  gender: string | null;
  ethnicity: string | null;
  hair_color: string | null;
  age_range: string | null;
  approved_categories: string[];
  excluded_categories: string[];
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

function fuzzyEq(a: string, b: string): boolean {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  return x === y || x.includes(y) || y.includes(x);
}

// Modello a filtro rigido: l'avatar è un match SOLO se soddisfa OGNI attributo
// esplicitamente richiesto. Gli attributi NON richiesti vengono ignorati del tutto
// (es. "uomo caucasico capelli neri" -> tutti, a prescindere dagli occhi/corporatura).
export function scoreAvatar(av: ScorableAvatar, attrs: PromptAttributes, category: string | null): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  // Vincolo categoria/consenso (hard) — la categoria è scelta esplicitamente dal menu.
  if (category) {
    if (av.excluded_categories?.includes(category)) {
      return { score: 0, allowed: false, reasons: [`categoria "${category}" esclusa dal consenso`] };
    }
    if (!av.approved_categories?.includes(category)) {
      return { score: 0, allowed: false, reasons: [`categoria "${category}" non consentita`] };
    }
    score += 1;
    reasons.push(`categoria ${category}`);
  }

  if (attrs.gender) {
    if (!av.gender || av.gender !== attrs.gender) {
      return { score: 0, allowed: false, reasons: ["genere diverso"] };
    }
    score += 1;
    reasons.push("genere");
  }

  if (attrs.ethnicity) {
    if (!av.ethnicity || !fuzzyEq(av.ethnicity, attrs.ethnicity)) {
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

  return { score, allowed: true, reasons };
}

// Numero di criteri esplicitamente richiesti (identità + categoria scelta).
export function specifiedCount(attrs: PromptAttributes, category: string | null): number {
  let n = 0;
  if (category) n++;
  if (attrs.gender) n++;
  if (attrs.ethnicity) n++;
  if (attrs.hair_color) n++;
  if (attrs.age_min != null && attrs.age_max != null) n++;
  return n;
}
