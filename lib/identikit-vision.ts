import Anthropic from "@anthropic-ai/sdk";
import { IDENTITY_KIT } from "@/lib/types";

// ──────────────────────────────────────────────────────────────────────────
// IDENTIKIT VISION — suggerisce i campi dell'identity kit a partire dalle foto
// caricate dalla persona. SERVER-ONLY (usa ANTHROPIC_API_KEY).
//
// Principio (deciso 2026-06-08): Claude SUGGERISCE, la persona CONFERMA. Quindi
// qui restituiamo solo proposte, da rivedere nel form. Inferiamo SOLO attributi
// visivi non sensibili. NON inferiamo MAI:
//  - ethnicity → dato sensibile GDPR (Art. 9): lo dichiara la persona.
//  - language  → non deducibile da una foto.
// ──────────────────────────────────────────────────────────────────────────

// Campi che Claude può proporre (sottoinsieme visivo di IDENTITY_KIT).
const VISION_FIELDS = [
  "gender", "age_range", "hair_color", "eye_color",
  "body_type", "height", "facial_hair", "glasses", "tattoos",
] as const;
type VisionField = (typeof VISION_FIELDS)[number];

export type IdentikitSuggestions = Partial<Record<VisionField, string>>;

export interface VisionImage {
  data: string;       // base64 SENZA prefisso data-url
  mediaType: string;  // es. "image/jpeg"
}

// Costruisce la lista "campo: opzioni valide" da passare al modello.
function allowedList(): string {
  return VISION_FIELDS.map((f) => `- ${f}: ${(IDENTITY_KIT[f] as readonly string[]).join(" | ")}`).join("\n");
}

/**
 * Analizza fino a 4 foto e propone i campi dell'identity kit. Ritorna solo i
 * campi con un valore VALIDO (tra le opzioni di IDENTITY_KIT); gli incerti vengono
 * omessi. Non lancia per risposte malformate: ritorna {} (suggerimento assente).
 */
export async function analyzeIdentikit(images: VisionImage[]): Promise<IdentikitSuggestions> {
  if (!process.env.ANTHROPIC_API_KEY) return {};
  const imgs = images.slice(0, 4);
  if (imgs.length === 0) return {};

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = `Sei un assistente che PRE-COMPILA un modulo strutturato a partire dalle foto di una persona reale che sta registrando il proprio volto (con consenso).
Osserva le foto e proponi SOLO questi campi, scegliendo ESCLUSIVAMENTE tra le opzioni elencate:
${allowedList()}

Regole TASSATIVE:
- Rispondi SOLO con JSON valido, nient'altro. Chiavi = nomi dei campi sopra.
- USA SOLO i valori esatti elencati. Se per un campo sei incerto, OMETTI il campo (non indovinare).
- NON dedurre etnia, religione, lingua o altri dati sensibili: non sono richiesti.
- Sono proposte: la persona le confermerà o correggerà.`;

  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system,
    messages: [
      {
        role: "user",
        content: [
          ...imgs.map((img) => ({
            type: "image" as const,
            source: { type: "base64" as const, media_type: img.mediaType as "image/jpeg", data: img.data },
          })),
          { type: "text" as const, text: "Proponi i campi del modulo da queste foto. Solo JSON." },
        ],
      },
    ],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text.replace(/^```json?/i, "").replace(/```$/, "").trim());
  } catch {
    return {};
  }

  // Tieni solo i campi con valore tra le opzioni valide.
  const out: IdentikitSuggestions = {};
  for (const f of VISION_FIELDS) {
    const v = parsed[f];
    if (typeof v === "string" && (IDENTITY_KIT[f] as readonly string[]).includes(v)) {
      out[f] = v;
    }
  }
  return out;
}
