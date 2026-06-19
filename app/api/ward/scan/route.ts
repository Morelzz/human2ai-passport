import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { allowRequest } from "@/lib/rate-limit";
import { runScan } from "@/lib/ward/scan";
import { SupabaseScanRepository } from "@/lib/ward/scan-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ward/scan { avatarId } — lancia uno scan di protezione per un avatar
// POSSEDUTO dall'utente. Pensato per girare sull'host worker (Railway, next
// start), dove face-api/tfjs/sharp girano senza il cap di durata serverless.
// La pipeline applica da sola il consent gate (A2.1) e la data-minimization
// (A2.3): qui facciamo solo auth + ownership + rate-limit.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  // Uno scan e' costoso (modelli + rete): rate-limit per utente.
  const allowed = await allowRequest(`ward-scan:${user.id}`, 6, 60 * 60);
  if (!allowed) return NextResponse.json({ error: "Troppe scansioni, riprova piu' tardi" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const avatarId = String(body?.avatarId ?? "").trim();
  if (!avatarId) return NextResponse.json({ error: "avatarId mancante" }, { status: 400 });

  // Ownership: l'utente deve possedere l'avatar.
  const admin = createServerClient();
  const { data: av } = await admin
    .from("avatars")
    .select("id, owner_id, portrait_url")
    .eq("id", avatarId)
    .maybeSingle();
  if (!av || av.owner_id !== user.id) {
    return NextResponse.json({ error: "Avatar non trovato" }, { status: 404 });
  }

  const result = await runScan(avatarId, {
    repo: new SupabaseScanRepository(),
    // Riferimento pubblico per la discovery reale (Google Vision); lo stub lo ignora.
    referenceImageUrl: (av.portrait_url as string | null) ?? undefined,
  });

  // Gate negato non e' un errore HTTP: e' un esito di consenso (403).
  const status = result.ok ? 200 : result.status === "error" ? 500 : 403;
  return NextResponse.json(result, { status });
}
