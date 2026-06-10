-- H2 (booking) + H4 (mappa) — sedi di scansione e prenotazioni.
-- Multi-sede dal giorno uno: oggi un'unica riga (Studio Void, Rimini);
-- ogni Capture Partner certificato diventera' una riga nuova = un pin
-- nuovo sulla mappa, zero codice.
create table if not exists sedi (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city text not null,
  lat double precision,
  lng double precision,
  status text not null default 'attiva' check (status in ('attiva', 'in_arrivo')),
  booking_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

insert into sedi (slug, name, city, lat, lng, status) values
  ('void-rimini', 'Studio Void', 'Rimini', 44.0598, 12.5664, 'attiva')
on conflict (slug) do nothing;

-- Prenotazioni di scansione. Stati dal brief:
-- richiesta -> confermata -> completata -> avatar_in_lavorazione (+ annullata).
-- Pagamento: Stripe Checkout quando configurato; fino ad allora "in studio".
create table if not exists scan_bookings (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references sedi(id),
  name text not null,
  email text not null,
  phone text,
  preferred_at timestamptz not null,
  notes text,
  price_cents integer not null,
  payment_status text not null default 'da_pagare' check (payment_status in ('da_pagare', 'pagato', 'rimborsato')),
  stripe_session_id text,
  status text not null default 'richiesta' check (status in ('richiesta', 'confermata', 'completata', 'avatar_in_lavorazione', 'annullata')),
  created_at timestamptz not null default now()
);

-- Accesso SOLO server-side (service role): nessuna policy pubblica.
alter table sedi enable row level security;
alter table scan_bookings enable row level security;
