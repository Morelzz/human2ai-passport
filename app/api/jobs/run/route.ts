import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { executeEchoJob, reapStaleJobs, type EchoJobRow } from "@/lib/echo-job";

export const runtime = "nodejs";
// Esegue la chiamata lunga a OpenAI: va lanciata su un host SENZA cap di durata
// (in locale, o Render/Railway che eseguono `next start`). Su Vercel Hobby
// verrebbe troncata a ~60s — il poller NON deve puntare a Vercel per i job.
// Con la concorrenza i job girano IN PARALLELO, quindi il tempo di parete resta
// ~quello del job piu' lento (cap 4min via AbortController), non la somma.
export const maxDuration = 300;

type Admin = ReturnType<typeof createServerClient>;
type ClaimRow = EchoJobRow & { engine: string };

// Quanti job eseguire IN PARALLELO a ogni tick. Default prudente 3: il vero tetto
// sono i rate-limit OpenAI di gpt-image, si alza solo quando li conosciamo. Il
// claim e' atomico (claim_generation_jobs con FOR UPDATE SKIP LOCKED), quindi piu'
// tick/worker sovrapposti (incluso quello su Railway, stesso DB condiviso) non
// prendono mai lo stesso job. Cap a 10 per non sfondare memoria/rate-limit.
function workerConcurrency(): number {
  const n = Number(process.env.WORKER_CONCURRENCY);
  if (!Number.isFinite(n) || n < 1) return 3;
  return Math.min(Math.floor(n), 10);
}

// Esegue UN job gia' reclamato instradando per motore. Non rilancia: executeEchoJob
// gestisce i propri errori internamente (status 'error' + storno idempotente);
// qui copriamo solo il ramo motore-non-supportato.
async function runClaimedJob(admin: Admin, job: ClaimRow): Promise<void> {
  if (job.engine === "echo") {
    await executeEchoJob(admin, job);
  } else {
    await admin
      .from("generation_jobs")
      .update({ status: "error", finished_at: new Date().toISOString(), error: `engine non supportato: ${job.engine}` })
      .eq("id", job.id);
  }
}

// Fallback se la RPC non e' ancora migrata: claim singolo come prima (un job
// pending, flip atomico pending->running). Tiene vivo il worker prima della
// migrazione, cosi' il deploy del codice e' sicuro a prescindere dall'ordine.
async function claimSingleFallback(admin: Admin): Promise<ClaimRow[]> {
  const { data: job } = await admin
    .from("generation_jobs")
    .select("id, avatar_id, handle, buyer_id, attempts, params, engine")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!job) return [];
  const { data: claimed } = await admin
    .from("generation_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", (job as { id: string }).id)
    .eq("status", "pending")
    .select("id");
  if (!claimed || claimed.length === 0) return [];
  return [job as unknown as ClaimRow];
}

// Worker pull-based: il poller chiama questa rotta; qui reclamiamo fino a N job
// pending e li eseguiamo IN PARALLELO. Protetta da segreto condiviso (x-worker-secret).
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

  const concurrency = workerConcurrency();

  // Claim atomico di fino a N job (FOR UPDATE SKIP LOCKED nella RPC).
  let jobs: ClaimRow[] = [];
  const { data, error } = await admin.rpc("claim_generation_jobs", { p_max: concurrency });
  if (error) {
    // RPC non ancora presente (migrazione non applicata) → claim singolo di ripiego.
    const missing = error.code === "PGRST202" || /function|does not exist|schema cache/i.test(error.message ?? "");
    if (!missing) console.error("[jobs/run] claim_generation_jobs:", error.message);
    jobs = await claimSingleFallback(admin);
  } else {
    jobs = (data ?? []) as ClaimRow[];
  }

  if (jobs.length === 0) return NextResponse.json({ idle: true });

  // Esecuzione PARALLELA: ogni job ha il suo timeout (AbortController 4min in
  // generateEcho) → N gpt-image insieme = throughput senza serializzare la corsia.
  await Promise.all(
    jobs.map((j) =>
      runClaimedJob(admin, j).catch((e) =>
        console.error(`[jobs/run] job ${j.id} crash inatteso:`, e instanceof Error ? e.message : e),
      ),
    ),
  );

  const jobIds = jobs.map((j) => j.id);
  // `jobId` singolare mantenuto per compatibilita' col poller vecchio gia' in esecuzione.
  return NextResponse.json({ idle: false, processed: jobs.length, jobIds, jobId: jobIds[0] });
}
