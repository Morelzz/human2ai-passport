import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAuthClient } from "@/lib/supabase-auth";
import { allowRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

// ──────────────────────────────────────────────────────────────────────────
// A1 — PROMPT ENHANCER (EXPANSION_V3). Migliora la SCENA del box di
// generazione: arricchisce ambientazione, luce, mood, composizione. Riusa la
// stessa Claude API del matching. Non parte mai da solo: lo chiama l'utente.
//
// VINCOLO NON NEGOZIABILE (dal doc): l'enhancer non maschera né riformula MAI
// un prompt per scavalcare una categoria non consentita. Qui il vincolo è
// STRUTTURALE: la categoria d'uso è un chip esplicito, validato server-side
// in /api/generate — l'enhancer non la tocca e non può toccarla. In più il
// system prompt vieta di introdurre contenuti di altre categorie.
// ──────────────────────────────────────────────────────────────────────────

const SYSTEM = `Sei il rifinitore di prompt di SEMBLIC, un registro di volti reali e consenzienti.
L'utente descrive una SCENA per generare un'immagine commerciale FOTOREALISTICA di una persona reale (l'identità del volto è bloccata dall'avatar, NON dal testo).

Riscrivi SOLO la scena, arricchendo: ambientazione concreta, azione, atmosfera e mood, e la luce SOLO come elemento naturale dell'ambiente (es. "luce dorata del tramonto che crea contrasti morbidi"). Frasi asciutte, niente elenchi.

VINCOLO FONDAMENTALE: NON aggiungere direttive fotografiche tecniche. In particolare NON menzionare MAI: tipo di macchina fotografica, obiettivo o focale (es. 35mm, 85mm), inquadratura (primo piano, mezzo busto, figura intera, piano americano), posa, espressione del viso, o color grading / stile colore (bianco e nero, cinematografico, pastello, contrasto...). Questi parametri li sceglie l'utente con controlli dedicati e vengono aggiunti SEPARATAMENTE: se li scrivi anche tu, si duplicano o vanno in conflitto con le sue scelte.

Se ti vengono fornite le scelte già fatte dall'utente (posa, inquadratura, espressione, stile, macchina, ottica, luce, immagini di riferimento), usale SOLO per mantenere la scena coerente (es. se la posa è "braccia conserte" non scrivere "mentre corre"; se c'è un oggetto di riferimento, integra naturalmente l'azione che lo coinvolge), ma NON ripeterle nel testo.

Altre regole TASSATIVE:
- NON cambiare il soggetto né descrivere tratti del volto/identità (età, etnia, lineamenti): l'identità arriva dall'avatar.
- SOLO fotorealismo: vietato introdurre stili non reali (anime, cartoon, illustrazione, 3D, pittura...).
- NON introdurre contenuti che cambino la categoria d'uso della scena (se è food resta food, ecc.); non aggiungere marchi, persone famose, contenuti sensibili o per adulti.
- Mantieni la lingua dell'utente. Massimo 450 caratteri.
- Rispondi SOLO con JSON valido: {"enhanced": "la scena riscritta"}`;

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  // Rate-limit per utente: l'enhancer chiama Claude (costo). Max 20/min.
  if (!(await allowRequest(`enhance:${user.id}`, 20, 60))) {
    return NextResponse.json({ error: "Troppe richieste, attendi un momento" }, { status: 429 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Enhancer non configurato" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const scene = String(body?.scene ?? "").trim().slice(0, 600);
  const category = body?.category ? String(body.category).trim() : null;
  // Contesto delle scelte gia fatte coi controlli dello Studio (token inglesi) +
  // descrizioni delle immagini di riferimento. Servono SOLO per la coerenza: il
  // system prompt vieta di ripeterle come direttive fotografiche nel testo.
  const photo = Array.isArray(body?.photo)
    ? (body.photo as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 10)
    : [];
  const refs = Array.isArray(body?.refs)
    ? (body.refs as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 4)
    : [];
  if (scene.length < 3) {
    return NextResponse.json({ error: "Scrivi prima una scena da migliorare" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            category ? `Categoria d'uso dichiarata (NON cambiarla): ${category}` : null,
            photo.length ? `Parametri fotografici GIA scelti dall'utente (NON ripeterli nel testo, usali solo per coerenza): ${photo.join("; ")}` : null,
            refs.length ? `Immagini di riferimento fornite dall'utente: ${refs.join("; ")}` : null,
            `Scena: ${scene}`,
          ].filter(Boolean).join("\n"),
        },
      ],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const parsed = JSON.parse(text.replace(/^```json?/i, "").replace(/```$/, "").trim()) as { enhanced?: string };
    const enhanced = String(parsed.enhanced ?? "").trim().slice(0, 500);
    if (!enhanced) throw new Error("risposta vuota");

    return NextResponse.json({ enhanced });
  } catch {
    return NextResponse.json({ error: "Miglioramento non riuscito, riprova" }, { status: 502 });
  }
}
