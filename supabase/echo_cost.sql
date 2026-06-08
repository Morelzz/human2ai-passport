-- ECHO — costo reale del compute (additivo, nullable). Nessuna modifica distruttiva.
-- Memorizza il costo OpenAI effettivo (centesimi €) calcolato dai token reali
-- restituiti da gpt-image-2, per riconciliare margini e tarare le tariffe in
-- lib/engines/echo-cost.ts. /api/generate scrive questa colonna best-effort:
-- finché la migrazione non è applicata, l'app gira lo stesso (l'update fallisce
-- in silenzio, la generazione resta registrata).

alter table generations add column if not exists engine_cost_cents integer;

comment on column generations.engine_cost_cents is
  'Costo reale del motore (centesimi €) dai token effettivi; solo ECHO/gpt-image-2. NULL = non disponibile.';
