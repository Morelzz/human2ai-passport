-- BONIFICA A5 (BOZZA, NON ancora applicata, attende "applica" di Morelz)
-- Coda con stato terminale 'dead_letter'.
--
-- COSA FA: aggiunge lo stato 'dead_letter' a generation_jobs.status. Un job che
-- fallisce in modo deterministico (es. prompt che viola il filtro OpenAI) va in
-- dead_letter dopo N tentativi, invece di poter essere ri-tentato all'infinito
-- bruciando costo del motore.
--
-- IMPATTO: additivo sull'enum di stato. NON cambia righe esistenti.
--
-- PREREQUISITO: questa e' SOLO la migrazione schema. Il comportamento (cap retry
-- + backoff esponenziale + passaggio a dead_letter) e CODICE del worker
-- (lib/echo-job.ts / claim), da scrivere DOPO l'apply.
--
-- ATTENZIONE: il nome reale del constraint di check va confermato prima di
-- applicare (di norma 'generation_jobs_status_check'). Verifica:
--   select conname from pg_constraint
--   where conrelid = 'generation_jobs'::regclass and contype = 'c';

alter table generation_jobs drop constraint if exists generation_jobs_status_check;
alter table generation_jobs add constraint generation_jobs_status_check
  check (status in ('pending', 'running', 'done', 'error', 'dead_letter'));
