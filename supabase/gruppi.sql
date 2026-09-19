-- SCENE DI GRUPPO (19/9/2026): una foto con 2-4 persone del registro, fatta
-- "un volto alla volta" (lib/gruppo.ts). Additiva, nessuna modifica
-- distruttiva. Si applica solo a "applica" di Morelz.
--
-- La generazione resta UNA per chi compra (generations.avatar_id = il primo da
-- sinistra, generations.royalty_cents = il totale alle persone). Qui c'e' chi
-- compare nella foto, con la sua parte e la sua somiglianza misurata.

create table if not exists generation_people (
  generation_id uuid not null references generations(id) on delete cascade,
  avatar_id uuid not null references avatars(id),
  posizione smallint not null check (posizione between 0 and 3), -- 0 = il primo da sinistra
  royalty_cents integer not null check (royalty_cents >= 0),
  identity_score integer check (identity_score between 0 and 100),
  identity_distance numeric(5,3),
  created_at timestamptz not null default now(),
  primary key (generation_id, avatar_id)
);

create index if not exists generation_people_avatar_idx on generation_people (avatar_id, created_at desc);

comment on table generation_people is
  'Scene di gruppo: chi compare nella foto, in che posizione, con che parte della royalty e che somiglianza.';

-- Solo il server (service role) legge e scrive: nessuna policy per i client, e
-- niente privilegi di default ad anon/authenticated.
alter table generation_people enable row level security;
revoke all on table generation_people from anon, authenticated;
