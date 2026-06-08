// ──────────────────────────────────────────────────────────────────────────
// Launcher di PRODUZIONE per l'host worker (es. Railway). In un solo servizio:
//   1) avvia il server Next (`next start`) → serve /api/jobs/run SENZA il cap di
//      durata di Vercel, quindi le generazioni lunghe (2K/4K) girano qui;
//   2) avvia il poller (worker/poll.mjs) che pinga il server nello STESSO
//      container ed esegue un job pending alla volta.
//
// Railway: imposta lo Start Command su `npm run start:railway`. Servono le env:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//   SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY,
//   HIGGSFIELD_API_KEY/SECRET (+MODE), e WORKER_SECRET (obbligatoria per il poller).
//
// Se uno dei due processi esce, usciamo con errore → Railway riavvia il servizio.
// ──────────────────────────────────────────────────────────────────────────

import { spawn } from "node:child_process";

const PORT = process.env.PORT || "3000";

function run(name, cmd, args, extraEnv) {
  const child = spawn(cmd, args, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
  child.on("exit", (code) => {
    console.error(`[start-prod] processo '${name}' terminato (codice ${code}) → esco per il restart`);
    process.exit(code ?? 1);
  });
  return child;
}

// 1) Server Next (serve /api/jobs/run; legge PORT da Railway).
run("next", "npx", ["next", "start", "-p", PORT]);

// 2) Poller contro se stesso (stesso container). Richiede WORKER_SECRET in env.
run("poller", "node", ["worker/poll.mjs"], { WORKER_URL: `http://localhost:${PORT}` });
