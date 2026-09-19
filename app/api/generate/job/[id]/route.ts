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
  // A job concluso serve anche l'id della generazione: la pagina Crea ci porta
  // Ward (/ward/content/[id]). Cercato per certificato, solo tra quelle del buyer.
  let generationId: string | undefined;
  let identityScore: number | undefined;
  // Scena di gruppo: chi c'e' nella foto, da sinistra, con la sua somiglianza.
  let persone: { handle: string; alias: string; somiglianza: number | null }[] | undefined;
  if (job.status === "done" && job.certificate) {
    const { data: gen } = await admin
      .from("generations")
      .select("id")
      .eq("certificate", job.certificate)
      .eq("buyer_id", user.id)
      .maybeSingle();
    generationId = gen?.id ?? undefined;
    if (generationId) {
      const { data: s } = await admin.from("generations").select("identity_score").eq("id", generationId).maybeSingle();
      const v = (s as { identity_score?: unknown } | null)?.identity_score;
      if (typeof v === "number") identityScore = v;
      const gruppo = (job.params as { gruppo?: unknown[] } | null)?.gruppo;
      if (Array.isArray(gruppo) && gruppo.length > 1) {
        const { data: gp } = await admin
          .from("generation_people")
          .select("posizione, identity_score, avatars(handle, alias)")
          .eq("generation_id", generationId)
          .order("posizione");
        type Riga = { identity_score: number | null; avatars: { handle: string; alias: string } | { handle: string; alias: string }[] | null };
        persone = ((gp ?? []) as Riga[]).flatMap((r) => {
          const a = Array.isArray(r.avatars) ? r.avatars[0] : r.avatars;
          return a ? [{ handle: a.handle, alias: a.alias, somiglianza: r.identity_score }] : [];
        });
      }
    }
  }
  return NextResponse.json({
    generation_id: generationId,
    identity_score: identityScore,
    persone,
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
