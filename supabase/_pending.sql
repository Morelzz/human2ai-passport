-- ════════════════════════════════════════════════════════════════════════
-- GO-LIVE — migrazioni pendenti (incolla TUTTO questo nello SQL Editor di Supabase).
-- Idempotente: si può lanciare più volte senza danni.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Ruolo enterprise (agenzie)
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('buyer','seller','admin','enterprise'));

-- 2) Segnalazioni di abuso / takedown
create table if not exists abuse_reports (
  id             uuid primary key default gen_random_uuid(),
  target_type    text not null check (target_type in ('avatar','content')),
  avatar_id      uuid references avatars(id) on delete set null,
  certificate    text,
  handle         text,
  reason         text not null check (reason in ('no_consent','impersonation','misuse','illegal','other')),
  details        text,
  reporter_email text,
  status         text not null default 'open' check (status in ('open','reviewing','upheld','dismissed')),
  resolution     text,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);
create index if not exists abuse_reports_status_idx on abuse_reports(status, created_at);
create index if not exists abuse_reports_avatar_idx on abuse_reports(avatar_id);

-- 3) Proprietà / ancoraggio on-chain (Base)
alter table avatars add column if not exists owner_wallet      text;
alter table avatars add column if not exists chain             text;
alter table avatars add column if not exists onchain_token_id  text;
alter table avatars add column if not exists onchain_tx        text;
alter table avatars add column if not exists anchored_at       timestamptz;
alter table avatars add column if not exists soulbound         boolean not null default true;
create index if not exists avatars_onchain_tx_idx on avatars(onchain_tx) where onchain_tx is not null;
