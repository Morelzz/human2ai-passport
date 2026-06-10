-- E3 — "IL TUO VOLTO È STATO CERCATO": log di OGNI ricerca di match
-- (additivo, nessun dato personale). Complementare a blocked_requests, che
-- registra solo i blocchi: qui si registra la FORMA di tutta la domanda —
-- attributi dell'identikit, categoria richiesta, esito — MAI chi cerca
-- (nessun buyer_id di proposito: serve la domanda, non l'identità).
--
-- Uso: card seller "N ricerche compatibili col tuo volto questa settimana,
-- di cui M in categorie che non concedi" (engagement + incentivo ad aprire
-- categorie vedendo domanda reale). Si somma alla heatmap F4 dei blocchi.
-- Idempotente.

create table if not exists match_searches (
  id            uuid primary key default gen_random_uuid(),
  attrs         jsonb,
  category      text,
  matched       boolean not null default false,
  results_count int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists match_searches_created_idx on match_searches (created_at);

-- RLS attiva, nessuna policy pubblica: scrive/legge solo il server (service role).
alter table match_searches enable row level security;
