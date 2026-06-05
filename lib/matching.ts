import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES } from "@/lib/types";

// Attributi estratti dal prompt del compratore.
export interface PromptAttributes {
  gender: "uomo" | "donna" | null;
  ethnicity: string | null;
  age_min: number | null;
  age_max: number | null;
  category: string | null;
}

// --- 1. Estrazione attributi via Claude API ---
export async function extractAttributes(prompt: string): Promise<PromptAttributes> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const system = `Sei un estrattore di attributi per un registro di volti umani.
Dato il prompt di un cliente che descrive l'essere umano che vuole generare,
estrai SOLO questi campi e rispondi ESCLUSIVAMENTE con JSON valido, nient'altro:
{
  "gender": "uomo" | "donna" | null,
  "ethnicity": stringa breve in italiano (es. "giapponese","italiana","afroamericano") | null,
  "age_min": numero intero | null,
  "age_max": numero intero | null,
  "category": una tra [${CATEGORIES.join(", ")}] | null
}
Regole:
- Se un attributo non è deducibile, usa null.
- "giovane" ~ 20-30, "adulto" ~ 30-45, "maturo/anziano" ~ 50+. Stima un range sensato.
- category: scegli la più pertinente all'uso descritto (es. campagna beauty -> Beauty).
- Non inventare attributi non presenti o impliciti nel prompt.`;

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
    age_min: typeof parsed.age_min === "number" ? parsed.age_min : null,
    age_max: typeof parsed.age_max === "number" ? parsed.age_max : null,
    category: parsed.category && (CATEGORIES as readonly string[]).includes(parsed.category) ? parsed.category : null,
  };
}

// --- 2. Punteggio di affinità avatar vs attributi ---
export interface ScorableAvatar {
  gender: string | null;
  ethnicity: string | null;
  age_range: string | null;
  approved_categories: string[];
  excluded_categories: string[];
}

export interface MatchResult {
  score: number;
  allowed: boolean; // false se la categoria è esclusa o non consentita
  reasons: string[];
}

function parseRange(range: string | null): [number, number] | null {
  if (!range) return null;
  const m = range.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10)];
}

export function scoreAvatar(av: ScorableAvatar, attrs: PromptAttributes): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  // Vincolo categoria/consenso
  if (attrs.category) {
    if (av.excluded_categories?.includes(attrs.category)) {
      return { score: 0, allowed: false, reasons: [`categoria "${attrs.category}" esclusa dal consenso`] };
    }
    if (!av.approved_categories?.includes(attrs.category)) {
      return { score: 0, allowed: false, reasons: [`categoria "${attrs.category}" non consentita`] };
    }
    score += 3;
    reasons.push(`categoria ${attrs.category} consentita`);
  }

  if (attrs.gender && av.gender) {
    if (av.gender === attrs.gender) { score += 3; reasons.push("genere"); }
    else return { score: 0, allowed: true, reasons: ["genere diverso"] };
  }

  if (attrs.ethnicity && av.ethnicity) {
    if (av.ethnicity.includes(attrs.ethnicity) || attrs.ethnicity.includes(av.ethnicity)) {
      score += 3; reasons.push("etnia");
    }
  }

  // Sovrapposizione fascia d'età
  const avRange = parseRange(av.age_range);
  if (avRange && attrs.age_min != null && attrs.age_max != null) {
    const overlap = Math.min(avRange[1], attrs.age_max) >= Math.max(avRange[0], attrs.age_min);
    if (overlap) { score += 2; reasons.push("età"); }
  }

  return { score, allowed: true, reasons };
}

// Soglia minima per accettare un match (sotto -> BLOCCA)
export const MATCH_THRESHOLD = 5;
