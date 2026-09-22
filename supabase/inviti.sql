-- ──────────────────────────────────────────────────────────────────────────
-- INVITA UN AMICO (23/9/2026)
--
-- Il premio e' in VOLT, mai in contanti, e arriva SOLO quando entrano soldi
-- veri (una ricarica), non quando si apre un account: altrimenti il programma
-- pagherebbe chi crea dieci caselle di posta.
--   · chi invita: 20% di ogni ricarica dell'invitato, per 12 mesi;
--   · l'invitato: 10% in piu' sulla sua prima ricarica.
--
-- Da incollare nel SQL Editor di Supabase (progetto H2AI), tutto insieme.
-- ──────────────────────────────────────────────────────────────────────────

begin;

-- Il codice da dare agli amici. Si crea la prima volta che uno apre la scheda
-- "Invita": chi non invita nessuno non ha nemmeno un codice.
alter table public.profiles add column if not exists invite_code text;
create unique index if not exists profiles_invite_code_idx on public.profiles (invite_code) where invite_code is not null;

create table if not exists public.inviti (
  -- uno si fa invitare UNA volta sola: la chiave e' l'invitato
  invitato_id uuid primary key references auth.users(id) on delete cascade,
  invitante_id uuid not null references auth.users(id) on delete cascade,
  codice text not null,
  created_at timestamptz not null default now(),
  scade_il timestamptz not null,
  prima_ricarica_fatta boolean not null default false,
  volt_guadagnati int not null default 0,
  -- nessuno invita se stesso
  constraint inviti_non_se_stesso check (invitato_id <> invitante_id)
);

create index if not exists inviti_invitante_idx on public.inviti (invitante_id, created_at desc);

alter table public.inviti enable row level security;

-- Dal browser si vedono solo i propri inviti (quelli fatti e quello ricevuto).
-- Chi scrive e' sempre il server con la chiave di servizio: un premio non si
-- accredita da soli.
drop policy if exists inviti_miei on public.inviti;
create policy inviti_miei on public.inviti
  for select using (auth.uid() = invitante_id or auth.uid() = invitato_id);

commit;
