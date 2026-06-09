-- B4/B2 — RICHIESTE COMMERCIALI (additivo). Una tabella per entrambi i canali:
--   kind='studio'     → HUMAN2AI Studio (campagne "done for you")
--   kind='enterprise' → roster riservato / licenze prioritarie per brand
-- Solo i dati del form di contatto; nessun dato sensibile.

create table if not exists business_inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('studio','enterprise')),
  company text not null,
  name text not null,
  email text not null,
  budget text,
  message text not null,
  status text not null default 'new' check (status in ('new','contacted','won','lost')),
  created_at timestamptz not null default now()
);

create index if not exists business_inquiries_created_idx on business_inquiries (created_at);

-- RLS attiva, nessuna policy pubblica: scrive/legge solo il server (service role).
alter table business_inquiries enable row level security;
