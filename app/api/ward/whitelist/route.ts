import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { hostOf } from "@/lib/ward/discovery/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ward/whitelist { matchId, scope: 'host'|'url' } — "Segna sicuro".
// Scrive una voce allowlist legata alla GENERAZIONE del match: al prossimo scan il
// risultato whitelisted non comparira' piu' (la whitelist NASCONDE). Idempotente
// a livello applicativo (select-then-insert). Ownership: l'utente deve essere il
// buyer della generazione da cui nasce il match.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const matchId = String(body?.matchId ?? "").trim();
  const scope: "host" | "url" = body?.scope === "url" ? "url" : "host";
  if (!matchId) return NextResponse.json({ error: "matchId mancante" }, { status: 400 });

  const admin = createServerClient();

  // match -> job -> generazione (per l'ownership e per legare la voce). Rispondiamo
  // 404 a ogni anello mancante o sessione non proprietaria (non riveliamo nulla).
  const { data: match } = await admin
    .from("scan_matches")
    .select("id, source_url, host, scan_job_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match || !match.scan_job_id) {
    return NextResponse.json({ error: "Risultato non trovato" }, { status: 404 });
  }

  const { data: job } = await admin
    .from("scan_jobs")
    .select("id, generation_id")
    .eq("id", match.scan_job_id)
    .maybeSingle();
  if (!job || !job.generation_id) {
    return NextResponse.json({ error: "Risultato non trovato" }, { status: 404 });
  }

  const { data: gen } = await admin
    .from("generations")
    .select("id, buyer_id, avatar_id")
    .eq("id", job.generation_id)
    .maybeSingle();
  if (!gen || gen.buyer_id !== user.id) {
    return NextResponse.json({ error: "Risultato non trovato" }, { status: 404 });
  }

  const host = (match.host as string | null) ?? hostOf(match.source_url as string);
  // value confrontabile: per 'host' = dominio, per 'url' = url completo.
  const value = scope === "url" ? (match.source_url as string) : host;

  // Idempotente: se la voce esiste gia' per questa generazione, non duplicare.
  const dedupColumn = scope === "url" ? "value" : "host";
  const { data: existing } = await admin
    .from("allowlist")
    .select("id")
    .eq("generation_id", gen.id)
    .eq("entry_type", scope)
    .eq(dedupColumn, value)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, allowId: existing.id, deduped: true });
  }

  const { data: ins, error } = await admin
    .from("allowlist")
    .insert({
      avatar_id: gen.avatar_id,
      generation_id: gen.id,
      entry_type: scope,
      host, // sempre il dominio (anche per le url), host e' NOT NULL
      value: scope === "url" ? (match.source_url as string) : null,
      reason: "user_marked_safe",
    })
    .select("id")
    .single();
  if (error) {
    return NextResponse.json({ error: "Errore salvataggio" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, allowId: ins.id });
}
