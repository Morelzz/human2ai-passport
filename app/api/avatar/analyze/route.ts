import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { analyzeIdentikit, type VisionImage } from "@/lib/identikit-vision";

export const runtime = "nodejs";
export const maxDuration = 60;

// Analizza le foto caricate e PROPONE i campi dell'identity kit (Claude vision).
// Solo suggerimenti: la persona conferma nel form. Niente etnia/lingua (vedi
// lib/identikit-vision). Richiede login (è parte dell'onboarding del creatore).
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const raw = Array.isArray(body?.images) ? body.images : [];
  // Accetta data-url ("data:image/jpeg;base64,..."): estrae media-type + base64.
  const images: VisionImage[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(item);
    if (!m) continue;
    images.push({ mediaType: m[1], data: m[2] });
  }
  if (images.length === 0) {
    return NextResponse.json({ error: "Nessuna immagine valida" }, { status: 400 });
  }

  try {
    const suggestions = await analyzeIdentikit(images);
    return NextResponse.json({ suggestions });
  } catch {
    // L'analisi è un di più: se fallisce, l'utente compila a mano.
    return NextResponse.json({ suggestions: {}, note: "analisi non riuscita" });
  }
}
