import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { executeEchoJob, reapStaleJobs, type EchoJobRow } from "@/lib/echo-job";

export const runtime = "nodejs";
// Esegue la chiamata lunga a OpenAI: va lanciata su un host SENZA cap di durata
// (in locale, o Render/Railway che eseguono `next start`). Su Vercel Hobby
// verrebbe troncata a ~60s — il poller NON deve puntare a Vercel per i job.
export const maxDuration = 300;

// Worker pull-based: il poller chiama questa rotta; qui reclamiamo UN job pending
// e lo eseguiamo. Protetta da segreto condiviso (x-worker-secret). Idempotente
// rispetto alle corse: il claim atomico pending→running evita doppie esecuzioni.
export async function POST(request: Request) {
  const secret = process.env.WORKER_SECRET;
  if (!secret) return NextResponse.json({ error: "Worker non configurato" }, { status: 503 });
  if (request.headers.get("x-worker-secret") !== secret) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const admin = createServerClient();

  // Prima del claim: libera i job orfani rimasti 'running' (worker morto a meta',
  // altrimenti restano per sempre e mangiano i VOLT spesi all'enqueue). Idempotente.
  await reapStaleJobs(admin);

  // Prendi il job pending più vecchio.
  const { data: job } = await admin
    .from("generation_jobs")
    .select("id, avatar_id, handle, buyer_id, attempts, params, engine")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!job) return NextResponse.json({ idle: true });

  // Claim atomico: solo chi riesce a flippare pending→running lo esegue.
  const { data: claimed } = await admin
    .from("generation_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("status", "pending")
    .select("id");
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ idle: false, note: "job già preso da un altro worker" });
  }

  if (job.engine === "echo") {
    await executeEchoJob(admin, job as unknown as EchoJobRow);
  } else {
    await admin.from("generation_jobs").update({ status: "error", error: `engine non supportato: ${job.engine}` }).eq("id", job.id);
  }

  return NextResponse.json({ idle: false, jobId: job.id });
}
