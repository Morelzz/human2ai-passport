import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { allowRequest } from "@/lib/rate-limit";
import { runContentScan } from "@/lib/ward/content-scan";
import { SupabaseContentScanRepository } from "@/lib/ward/content-scan-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Discovery (Vision) + fetch dei candidati + phash/sharp: alza il cap serverless
// come per /api/ward/scan.
export const maxDuration = 60;

// POST /api/ward/content-scan { generationId } — Ward v2 (content leak finder):
// cerca le COPIE sul web di una NOSTRA immagine generata. L'asset e' di proprieta'
// del buyer, quindi NIENTE consenso/KYC. Qui facciamo solo auth + ownership (buyer
// della generazione) + rate-limit; runContentScan fa discovery + verdetto per
// immagine + esclusione dei whitelisted. Ritorna i risultati VISIBILI.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  // Uno scan consuma Google Vision: rate-limit per utente.
  const allowed = await allowRequest(`ward-content-scan:${user.id}`, 12, 60 * 60);
  if (!allowed) return NextResponse.json({ error: "Troppe scansioni, riprova piu' tardi" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const generationId = String(body?.generationId ?? "").trim();
  if (!generationId) return NextResponse.json({ error: "generationId mancante" }, { status: 400 });

  // Ownership: l'utente deve essere il BUYER della generazione (come /api/content).
  const admin = createServerClient();
  const { data: gen } = await admin
    .from("generations")
    .select("id, buyer_id, avatar_id, image_url")
    .eq("id", generationId)
    .maybeSingle();
  if (!gen || gen.buyer_id !== user.id) {
    return NextResponse.json({ error: "Generazione non trovata" }, { status: 404 });
  }
  if (!gen.image_url) {
    return NextResponse.json({ error: "Immagine della generazione non disponibile" }, { status: 422 });
  }

  // Byte dell'immagine generata: query reverse-image per la discovery + originale
  // per il confronto phash del verdetto.
  let generationBytes: Uint8Array;
  try {
    const res = await fetch(gen.image_url as string);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    generationBytes = new Uint8Array(await res.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Impossibile leggere l'immagine generata" }, { status: 502 });
  }

  const result = await runContentScan(generationId, {
    repo: new SupabaseContentScanRepository(gen.avatar_id as string),
    generationBytes,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  // Risultati VISIBILI: i whitelisted non sono stati neppure inseriti, quindi le
  // righe scan_matches del job sono gia' quelle da mostrare.
  const { data: matches } = await admin
    .from("scan_matches")
    .select("id, source_url, page_url, host, band, reputation, watermark_present, certificate, phash, created_at")
    .eq("scan_job_id", result.jobId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ ...result, matches: matches ?? [] }, { status: 200 });
}
