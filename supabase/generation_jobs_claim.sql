-- Claim CONCORRENTE dei job di generazione (#1b, throughput ECHO).
-- Additiva e idempotente (create or replace + revoke). Nessuna modifica alla
-- tabella generation_jobs ne' al flusso stato (pending -> running -> done|error).
--
-- PERCHE' una funzione: PostgREST/supabase-js NON sa esprimere FOR UPDATE SKIP
-- LOCKED. Il worker (/api/jobs/run) chiama claim_generation_jobs(N) per prendere
-- fino a N job pending IN UN COLPO SOLO, in modo atomico e senza che due worker
-- sovrapposti reclamino la stessa riga:
--   * FOR UPDATE     blocca le righe scelte per questa transazione;
--   * SKIP LOCKED    salta le righe gia' bloccate da un'altra transazione.
-- E' la garanzia che regge anche col DB CONDIVISO tra locale e worker su Railway
-- (e tra piu' tick paralleli dello stesso poller): mai doppia esecuzione.
--
-- Il claim setta subito started_at, cosi' il reaper dei job orfani li vede tutti
-- (stessa logica del claim singolo precedente). attempts viene incrementato dal
-- worker (executeEchoJob), non qui.

create or replace function claim_generation_jobs(p_max integer default 1)
returns setof generation_jobs
language sql
security definer
set search_path = public
as $$
  update generation_jobs
  set status = 'running', started_at = now()
  where id in (
    select id
    from generation_jobs
    where status = 'pending'
    order by created_at
    limit greatest(coalesce(p_max, 1), 1)
    for update skip locked
  )
  returning *;
$$;

-- Come le funzioni VOLT: la chiama SOLO il service role (il worker), mai il client.
revoke execute on function claim_generation_jobs(integer) from public, anon, authenticated;
