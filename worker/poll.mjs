// ──────────────────────────────────────────────────────────────────────────
// ECHO WORKER — poller. Pinga /api/jobs/run a intervalli: l'endpoint esegue UN
// job pending (la chiamata lunga a OpenAI gira lì, su host senza cap di durata).
//
// Questo file NON fa lavoro pesante: solo fetch in loop. Quindi è semplice e
// portabile (nessuna dipendenza da lib/, niente sharp/alias).
//
// USO (locale, mentre `npm run dev` è attivo):
//   node --env-file=.env.local worker/poll.mjs
// In produzione: deploya la stessa app Next su un host senza cap (Render/Railway,
// `next start`) e fai puntare WORKER_URL a quell'host; tieni il poller acceso lì
// (o usa un cron che chiama /api/jobs/run).
//
// ENV:
//   WORKER_URL     base url dell'app che esegue i job (default http://localhost:3000)
//   WORKER_SECRET  segreto condiviso con /api/jobs/run (obbligatorio)
//   WORKER_IDLE_MS attesa quando non ci sono job (default 4000)
//   WORKER_BUSY_MS attesa dopo un job processato (default 500)
// ──────────────────────────────────────────────────────────────────────────

const BASE = (process.env.WORKER_URL || "http://localhost:3000").replace(/\/$/, "");
const SECRET = process.env.WORKER_SECRET;
const IDLE_MS = Number(process.env.WORKER_IDLE_MS || 4000);
const BUSY_MS = Number(process.env.WORKER_BUSY_MS || 500);

if (!SECRET) {
  console.error("WORKER_SECRET mancante: impostalo (.env.local) e riprova.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tick() {
  try {
    const res = await fetch(`${BASE}/api/jobs/run`, {
      method: "POST",
      headers: { "x-worker-secret": SECRET },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[worker] ${res.status}:`, json?.error ?? "errore");
      return IDLE_MS;
    }
    if (json.idle) return IDLE_MS;
    if (json.jobId) console.log(`[worker] job ${json.jobId} processato`);
    return BUSY_MS; // c'era lavoro: ricontrolla subito
  } catch (e) {
    console.error("[worker] rete:", e?.message ?? e);
    return IDLE_MS;
  }
}

console.log(`[worker] avviato → ${BASE}/api/jobs/run (idle ${IDLE_MS}ms)`);
// eslint-disable-next-line no-constant-condition
while (true) {
  const wait = await tick();
  await sleep(wait);
}
