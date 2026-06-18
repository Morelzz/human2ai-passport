import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAuthClient } from "@/lib/supabase-auth";
import { PRESETS } from "@/lib/editor/types";

export const runtime = "nodejs";
export const maxDuration = 20;

// ──────────────────────────────────────────────────────────────────────────
// /api/edit/interpret — "Dimmi cosa cambiare". Traduce una frase in linguaggio
// naturale in DELTA sui parametri dell'editor. Output validato su whitelist; il
// client applica i delta. Se non configurato/fallisce, il client usa il
// fallback a parole chiave (offline). Stessa Claude API dell'enhancer.
// ──────────────────────────────────────────────────────────────────────────

// Percorsi <sezione>.<chiave> ammessi (delta relativi -100..100).
const PATHS = new Set([
  "light.exp", "light.con", "light.hi", "light.sha", "light.wh", "light.bl",
  "color.temp", "color.tint", "color.vib", "color.sat",
  "detail.sharp", "detail.clar", "detail.tex", "detail.haze", "detail.vig", "detail.grain",
]);
const PRESET_KEYS = new Set(PRESETS.map((p) => p.key));

const SYSTEM = `Traduci una richiesta di fotoritocco in linguaggio naturale in regolazioni per l'editor Semblic.
Rispondi SOLO con JSON valido: {"adjust": {"<sezione.chiave>": <delta>}, "preset": "<chiave o vuoto>"}.

Chiavi valide per "adjust" (delta RELATIVI, interi -100..100):
- light.exp (esposizione), light.con (contrasto), light.hi (alte luci), light.sha (ombre), light.wh (bianchi), light.bl (neri)
- color.temp (temperatura: + caldo, - freddo), color.tint (tinta), color.vib (vividezza), color.sat (saturazione)
- detail.sharp (nitidezza), detail.clar (chiarezza), detail.tex (texture), detail.haze (foschia), detail.vig (vignettatura 0..100), detail.grain (grana 0..100)

Preset validi: naturale, pastello, contrasto, bn, cinema, vintage, dorato, freddo, seppia, matte, hdr, cross.

Regole: usa delta piccoli e sensati (es. "piu caldo" -> color.temp 30; "schiarisci" -> light.exp 26; "piu contrasto" -> light.con 28; "piu nitido" -> detail.sharp 30; "vignetta" -> detail.vig 45; "grana" -> detail.grain 40). "bianco e nero" -> preset "bn"; "cinematografico" -> preset "cinema". Italiano. Se nulla corrisponde, {"adjust":{},"preset":""}.`;

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Non configurato" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const text = String(body?.text ?? "").trim().slice(0, 200);
  if (text.length < 2) return NextResponse.json({ error: "Scrivi cosa cambiare" }, { status: 400 });

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: "user", content: text }],
    });
    const raw = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const parsed = JSON.parse(raw.replace(/^```json?/i, "").replace(/```$/, "").trim()) as {
      adjust?: Record<string, unknown>;
      preset?: unknown;
    };

    // Whitelist + clamp.
    const adjust: Record<string, number> = {};
    if (parsed.adjust && typeof parsed.adjust === "object") {
      for (const [k, v] of Object.entries(parsed.adjust)) {
        if (PATHS.has(k) && typeof v === "number" && Number.isFinite(v)) {
          adjust[k] = Math.max(-100, Math.min(100, Math.round(v)));
        }
      }
    }
    const preset = typeof parsed.preset === "string" && PRESET_KEYS.has(parsed.preset) ? parsed.preset : null;

    return NextResponse.json({ adjust, preset });
  } catch {
    return NextResponse.json({ error: "Interpretazione non riuscita" }, { status: 502 });
  }
}
