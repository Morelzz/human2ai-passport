-- ──────────────────────────────────────────────────────────────────────────
-- LE RICETTE DI CREA (27/9/2026). Una ricetta e' uno scatto riuscito senza la
-- persona: scena, luce, vestiti per posizione, formato, look, qualita', regia.
-- Ognuno vede e cambia solo le proprie. Da incollare nel SQL Editor (H2AI).
-- ──────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.ricette (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 60),
  scena text not null check (char_length(scena) between 3 and 1200),
  luce text check (char_length(luce) <= 40),
  vestiti jsonb not null default '[]'::jsonb check (jsonb_typeof(vestiti) = 'array' and jsonb_array_length(vestiti) <= 4),
  formato text not null default 'verticale' check (formato in ('verticale', 'quadrato', 'orizzontale')),
  look text not null default 'naturale' check (char_length(look) <= 20),
  qualita text not null default 'alta' check (qualita in ('bozza', 'alta', 'massima')),
  inquadratura text check (char_length(inquadratura) <= 40),
  espressione text check (char_length(espressione) <= 40),
  posa text check (char_length(posa) <= 40),
  certificate text check (char_length(certificate) <= 80),
  created_at timestamptz not null default now()
);

create index if not exists ricette_owner_idx on public.ricette (owner_id, created_at desc);

alter table public.ricette enable row level security;

drop policy if exists ricette_proprie on public.ricette;
create policy ricette_proprie on public.ricette
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

commit;
