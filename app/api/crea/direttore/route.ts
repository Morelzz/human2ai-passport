import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAuthClient } from "@/lib/supabase-auth";
import { allowRequest } from "@/lib/rate-limit";
import { scelteDirettore } from "@/lib/direttore";

export const runtime = "nodejs";
export const maxDuration = 20;

// ──────────────────────────────────────────────────────────────────────────
// /api/crea/direttore (27/9/2026). Legge la frase di Crea e restituisce le
// scelte da accendere nelle pillole, piu' i pezzi di frase da sottolineare.
// Non riscrive la frase, non genera niente, non costa crediti al cliente: e'
// una lettura con Haiku, dentro un tetto al minuto per persona. L'uscita passa
// dalla funzione pura scelteDirettore (solo valori dei cataloghi).
// Il volto non si descrive mai: lo decide la persona in scena.
// ──────────────────────────────────────────────────────────────────────────

const SYSTEM = `Leggi la descrizione di una foto da fare (in italiano, scritta da chi crea) e scegli le impostazioni dello studio che la frase implica CHIARAMENTE. Non inventare: se la frase non dice niente di un campo, lascialo vuoto. Non descrivere mai volti, età o identità.

Rispondi SOLO con JSON:
{"luce":"","formato":"","inquadratura":"","espressione":"","posa":"","look":"","vestiti":{},"evidenze":[]}

luce: naturale, morbida (luce da finestra, morbida), golden (tramonto, ora dorata), studio (softbox, luce da studio), taglio_destra (luce dura o di taglio da destra), taglio_sinistra (da sinistra), cupa (buio, low key, ombre profonde, noir), dall_alto (luce dall'alto, a picco), controluce, neon (neon, insegne, notte con luci colorate)
formato: verticale (storia, post verticale, ritratto), quadrato, orizzontale (banner, panoramica, sito)
inquadratura: primo_piano, mezzo_busto, americano (dalle ginocchia in su), figura_intera
espressione: sorriso, serio, pensieroso, risata
posa: casuale, tre_quarti, camminata (mentre cammina), mani_tasca, braccia_conserte, al_muro, profilo, di_spalle, sgabello, prodotto_mano
look: naturale, editoriale (da rivista, pulito), cinema (cinematografico), bn (bianco e nero), flash (flash diretto, festa), pellicola (analogico, grana)
vestiti: cosa indossa, con colori e materiali, com'e' scritto nella frase. Chiave = il nome della persona se la frase dice chi indossa cosa; "_" se c'e' una persona sola o non si capisce. Vuoto se la frase non parla di vestiti.
evidenze: i pezzi ESATTI della frase (copiati lettera per lettera, 1-6 parole) che ti hanno fatto scegliere qualcosa. Massimo 8.`;

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });
  // Si chiama mentre si scrive (con una pausa): un tetto largo ma presente.
  if (!(await allowRequest(`direttore:${user.id}`, 30, 60))) {
    return NextResponse.json({ error: "Troppe richieste, attendi un momento" }, { status: 429 });
  }
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Direttore non configurato" }, { status: 503 });

  const body = await request.json().catch(() => null);
  const frase = String(body?.frase ?? "").replace(/\s+/g, " ").trim().slice(0, 1200);
  const nomi: string[] = Array.isArray(body?.nomi) ? (body.nomi as unknown[]).map((n) => String(n ?? "").trim().slice(0, 40)).filter(Boolean).slice(0, 4) : [];
  if (frase.length < 8) return NextResponse.json({ error: "Frase troppo corta" }, { status: 400 });

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content: `${nomi.length ? `Persone in scena, da sinistra: ${nomi.join(", ")}.\n` : ""}Frase: ${frase}` }],
    });
    const raw = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
    const parsed = JSON.parse(raw.replace(/^```json?/i, "").replace(/```$/, "").trim());
    return NextResponse.json(scelteDirettore(parsed, frase, nomi));
  } catch {
    return NextResponse.json({ error: "Il direttore non ha risposto" }, { status: 502 });
  }
}
