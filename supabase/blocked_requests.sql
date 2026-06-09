-- A2/F4 — LOG DELLE RICHIESTE BLOCCATE (additivo, nessun dato personale).
-- Ogni volta che il filtro del consenso BLOCCA qualcosa (nessun avatar
-- consenziente, categoria esclusa/non autorizzata, consenso revocato) viene
-- registrata la FORMA della domanda: categoria richiesta, motivo, attributi
-- generici dell'identikit (genere/capelli/età). Mai chi ha chiesto, mai volti.
--
-- Doppio uso:
--  1) Transparency Report (/trasparenza): "questo mese abbiamo rifiutato di
--     generare N esseri umani senza consenso" — il numero manifesto.
--  2) Heatmap della domanda (ROADMAP_V2 Fase 4): quali categorie/tratti sono
--     richiesti e scoperti -> intelligence per reclutare i volti mancanti.

create table if not exists blocked_requests (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('match','generate')),
  reason text not null check (reason in ('no_match','category_excluded','category_not_approved','revoked')),
  category text,
  attrs jsonb,
  created_at timestamptz not null default now()
);

create index if not exists blocked_requests_created_idx on blocked_requests (created_at);

-- RLS attiva, nessuna policy pubblica: scrive/legge solo il server (service role).
alter table blocked_requests enable row level security;
