-- ──────────────────────────────────────────────────────────────────────────
-- CARTELLE PROGETTO E LINK PER IL CLIENTE (22/9/2026)
--
-- Chi lavora con Semblic non fa uno scatto: ne fa venti per una campagna, e poi
-- deve farli vedere a qualcuno che non ha un account. Oggi li manda per email
-- uno per uno, e la prova di consenso resta indietro.
--
-- Una cartella raccoglie gli scatti di chi li ha comprati e, se lui vuole, si
-- apre con un indirizzo pubblico difficile da indovinare: chi lo riceve vede le
-- foto, chi c'e' dentro e cosa ha autorizzato. Il link si spegne quando vuole.
--
-- Da incollare nel SQL Editor di Supabase (progetto H2AI), tutto insieme.
-- ──────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.progetti (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  cliente text check (char_length(cliente) <= 80),
  nota text check (char_length(nota) <= 500),
  -- l'indirizzo pubblico: casuale, lungo, e si puo' spegnere senza perderlo
  slug text unique not null,
  link_attivo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists progetti_owner_idx on public.progetti (owner_id, created_at desc);
create index if not exists progetti_slug_idx on public.progetti (slug) where link_attivo;

create table if not exists public.progetto_contenuti (
  progetto_id uuid not null references public.progetti(id) on delete cascade,
  generation_id uuid not null references public.generations(id) on delete cascade,
  posizione int not null default 0,
  created_at timestamptz not null default now(),
  primary key (progetto_id, generation_id)
);

create index if not exists progetto_contenuti_idx on public.progetto_contenuti (progetto_id, posizione);

-- ── Chi puo' vedere cosa ────────────────────────────────────────────────────
-- Di suo, nessuno: le pagine pubbliche passano dal server con la chiave di
-- servizio, che controlla link_attivo. Dal browser un utente vede e cambia solo
-- le PROPRIE cartelle.
alter table public.progetti enable row level security;
alter table public.progetto_contenuti enable row level security;

drop policy if exists progetti_propri on public.progetti;
create policy progetti_propri on public.progetti
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists progetto_contenuti_propri on public.progetto_contenuti;
create policy progetto_contenuti_propri on public.progetto_contenuti
  for all using (
    exists (select 1 from public.progetti p where p.id = progetto_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.progetti p where p.id = progetto_id and p.owner_id = auth.uid())
  );

commit;
