-- BONIFICA A13 (BOZZA, NON ancora applicata, attende "applica" di Morelz)
-- Rate-limit REALE. Oggi la RPC check_rate_limit NON esiste: allowRequest
-- (lib/rate-limit.ts) cade SEMPRE in fail-open, quindi il rate-limit e di fatto
-- spento ovunque. Questa la implementa.
--
-- COSA FA: conteggio atomico per chiave su finestra fissa, con advisory lock per
-- evitare corse tra richieste concorrenti dello stesso bucket. Tabella
-- rate_limit_hits gia presente (qui solo "if not exists" per sicurezza).
--
-- IMPATTO: additivo. DOPO l'apply il rate-limit inizia a contare davvero:
--   /api/generate     10/min per utente
--   /api/ward/scan    6/ora per utente
--   /api/verify-face  12/min per IP
-- In sviluppo, generando molto di fila si puo toccare il limite (comportamento
-- voluto). Reversibile (drop function).

create table if not exists rate_limit_hits (
  bucket_key   text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket_key, window_start)
);

create or replace function check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_window_seconds <= 0 or p_max <= 0 then
    return false; -- parametri assurdi: fail-closed
  end if;
  -- inizio della finestra fissa corrente, allineata a multipli di p_window_seconds.
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  -- atomico per chiave: niente corsa tra richieste concorrenti dello stesso bucket.
  perform pg_advisory_xact_lock(hashtext('ratelimit:' || p_key));
  insert into rate_limit_hits (bucket_key, window_start, hits)
  values (p_key, v_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set hits = rate_limit_hits.hits + 1
  returning hits into v_hits;
  -- pulizia best-effort delle finestre vecchie di questa chiave.
  delete from rate_limit_hits
  where bucket_key = p_key and window_start < now() - make_interval(secs => p_window_seconds * 3);
  return v_hits <= p_max;
end;
$$;

revoke execute on function check_rate_limit(text, integer, integer) from public, anon, authenticated;
