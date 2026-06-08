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
// CLI di Next chiamata direttamente con Node (niente `npx`: in un container
// minimale npx può bloccarsi/fallire senza loggare).
const NEXT_BIN = "node_modules/next/dist/bin/next";

console.log(`[start-prod] avvio: server Next + poller su PORT=${PORT}`);

function run(name, args, extraEnv) {
  const child = spawn(process.execPath, args, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
  child.on("exit", (code) => {
    console.error(`[start-prod] processo '${name}' terminato (codice ${code}) → esco per il restart`);
    process.exit(code ?? 1);
  });
  child.on("error", (err) => {
    console.error(`[start-prod] errore avvio '${name}':`, err?.message ?? err);
    process.exit(1);
  });
  return child;
}

// 1) Server Next (serve /api/jobs/run; legge PORT da Railway).
run("next", [NEXT_BIN, "start", "-p", PORT]);

// 2) Poller contro se stesso (stesso container). Richiede WORKER_SECRET in env.
run("poller", ["worker/poll.mjs"], { WORKER_URL: `http://localhost:${PORT}` });
