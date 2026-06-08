import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// Stato di un job di generazione asincrona (ECHO). Il client interroga questa
// rotta finché lo stato non è 'done' o 'error'. Restituisce l'esito (certificato,
// url, economia) solo a job concluso. Il buyer può vedere SOLO i propri job.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const admin = createServerClient();
  const { data: job } = await admin
    .from("generation_jobs")
    .select("id, buyer_id, status, error, certificate, image_url, gross_cents, fee_cents, royalty_cents, surcharge_cents, params")
    .eq("id", id)
    .maybeSingle();

  if (!job || job.buyer_id !== user.id) {
    return NextResponse.json({ error: "Job inesistente" }, { status: 404 });
  }

  const jobParams = (job.params as { category?: string | null; echoSize?: string } | null) ?? null;
  return NextResponse.json({
    status: job.status, // pending | running | done | error
    error: job.status === "error" ? job.error : undefined,
    category: jobParams?.category ?? null,
    size: jobParams?.echoSize ?? undefined,
    certificate: job.certificate ?? undefined,
    image_url: job.image_url ?? undefined,
    gross_cents: job.gross_cents ?? undefined,
    fee_cents: job.fee_cents ?? undefined,
    royalty_cents: job.royalty_cents ?? undefined,
    surcharge_cents: job.surcharge_cents ?? undefined,
  });
}
