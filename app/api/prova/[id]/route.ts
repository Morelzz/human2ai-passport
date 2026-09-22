import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { accountProva, provaAttiva } from "@/lib/prova-gratis";

// Stato di una prova. Pubblica (chi prova non ha un account), ma risponde SOLO
// sui lavori comprati dall'account di servizio: un id di lavoro indovinato non
// deve far vedere lo scatto di un cliente vero.
// Non torna mai l'immagine pulita: quella si scarica solo dall'account.

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!provaAttiva()) return NextResponse.json({ error: "non attiva" }, { status: 503 });

  const admin = createServerClient();
  const { data: conto } = await admin.from("profiles").select("id").eq("email", accountProva()).maybeSingle();
  if (!conto?.id) return NextResponse.json({ error: "non attiva" }, { status: 503 });

  const { data: job } = await admin
    .from("generation_jobs")
    .select("id, status, error, certificate, handle, buyer_id, created_at")
    .eq("id", id)
    .eq("buyer_id", conto.id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "non trovata" }, { status: 404 });

  if (job.status !== "done") {
    return NextResponse.json({ stato: job.status, errore: job.status === "error" ? job.error : null });
  }

  // I numeri che rendono la prova una prova: chi c'e', quanto le somiglia,
  // quanto ha incassato lei.
  const { data: gen } = await admin
    .from("generations")
    .select("identity_score, royalty_cents, avatars!generations_avatar_id_fkey(alias, handle, consent_start)")
    .eq("certificate", job.certificate as string)
    .maybeSingle();
  const av = gen ? (Array.isArray(gen.avatars) ? gen.avatars[0] : gen.avatars) : null;

  return NextResponse.json({
    stato: "done",
    certificato: job.certificate,
    immagine: `/api/prova/${job.id}/immagine`,
    alias: av?.alias ?? null,
    handle: av?.handle ?? job.handle,
    consenso_dal: av?.consent_start ?? null,
    somiglianza: gen?.identity_score ?? null,
    pagato_cent: gen?.royalty_cents ?? null,
  });
}
