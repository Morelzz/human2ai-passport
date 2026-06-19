import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { allowRequest } from "@/lib/rate-limit";
import { captureEvidence } from "@/lib/ward/evidence";
import { SupabaseEvidenceStorage, SupabaseEvidenceRepo } from "@/lib/ward/evidence-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ward/evidence { matchId } — cattura le prove (screenshot + HTML +
// WHOIS + hash) per un match POSSEDUTO dall'utente. Browser headless: pensato
// per l'host worker (Railway). Child-safety: i match 'minor' NON passano di qui.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const allowed = await allowRequest(`ward-evidence:${user.id}`, 30, 60 * 60);
  if (!allowed) return NextResponse.json({ error: "Troppe richieste, riprova piu' tardi" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const matchId = String(body?.matchId ?? "").trim();
  if (!matchId) return NextResponse.json({ error: "matchId mancante" }, { status: 400 });

  const admin = createServerClient();
  const { data: match } = await admin
    .from("scan_matches")
    .select("id, avatar_id, source_url, host, sensitivity")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return NextResponse.json({ error: "Match non trovato" }, { status: 404 });

  // Child-safety (priorita' massima): i minori non passano dal flusso normale.
  if (match.sensitivity === "minor") {
    return NextResponse.json({ error: "Non disponibile" }, { status: 403 });
  }

  // Ownership via avatar.
  const { data: av } = await admin.from("avatars").select("owner_id").eq("id", match.avatar_id).maybeSingle();
  if (!av || av.owner_id !== user.id) {
    return NextResponse.json({ error: "Match non trovato" }, { status: 404 });
  }

  const artifacts = await captureEvidence(
    { matchId: match.id, sourceUrl: match.source_url as string, host: (match.host as string | null) ?? "" },
    { storage: new SupabaseEvidenceStorage(), repo: new SupabaseEvidenceRepo() },
  );
  return NextResponse.json({ ok: true, ...artifacts });
}
