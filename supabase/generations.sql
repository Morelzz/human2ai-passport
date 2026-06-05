-- FASE 2 — Modulo 5: Wallet ad accumulo + royalty
-- Ogni generazione registra una riga e accredita royalty all'avatar (alla persona reale).

create table if not exists generations (
  id            uuid primary key default gen_random_uuid(),
  avatar_id     uuid not null references avatars(id) on delete cascade,
  buyer_id      uuid references auth.users(id) on delete set null,
  prompt        text,
  royalty_cents int not null default 0,
  certificate   text,                 -- hash anonimo della credenziale d'uscita
  created_at    timestamptz not null default now()
);

create index if not exists generations_avatar_idx on generations(avatar_id);
create index if not exists generations_buyer_idx on generations(buyer_id);
