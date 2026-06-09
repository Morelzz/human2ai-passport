-- B1 — CAPTURE PARTNER: candidature dal form pubblico /partner (additivo).
-- Fotografi/videomaker che si candidano alla rete fisica di acquisizione.
-- Solo i dati del form; nessun documento, nessun dato sensibile.

create table if not exists partner_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  email text not null,
  portfolio_url text,
  message text,
  status text not null default 'new' check (status in ('new','contacted','certified','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists partner_applications_created_idx on partner_applications (created_at);

-- RLS attiva, nessuna policy pubblica: scrive/legge solo il server (service role).
alter table partner_applications enable row level security;
