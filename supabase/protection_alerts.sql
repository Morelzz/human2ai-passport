-- Fase 2.5 (modulo VETO): alert al titolare di un volto protetto.
-- Quando qualcuno carica su /verify la foto di una persona in sola protezione,
-- registriamo l'evento per il TITOLARE (e' lui che scopre l'abuso e agisce, non
-- chi cerca). MAI dati di chi cerca: solo l'handle del protetto e la vicinanza.

create table if not exists protection_alerts (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  similarity integer,
  filtered boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists protection_alerts_handle_idx on protection_alerts (handle, created_at desc);

-- Accesso solo via service role (le API). Nessuna policy client.
alter table protection_alerts enable row level security;
