-- FASE 2 — Modulo 8: Enterprise (multi-avatar + gate di verifica + revisione operatori)
-- Idempotente.

-- Stato di verifica dell'avatar: solo 'approved' è pubblico nel registro.
-- Default 'approved' così gli avatar esistenti e quelli dei privati restano live.
-- Gli avatar onboardati da un'organizzazione partono 'pending_review'.
alter table avatars add column if not exists verification_status text not null default 'approved';
alter table avatars add column if not exists org_id uuid;
create index if not exists avatars_verification_idx on avatars(verification_status);

-- Organizzazioni (agenzie) — Enterprise. KYB a parte dal KYC individuale.
create table if not exists organizations (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  kyb_status text not null default 'pending',
  created_at timestamptz not null default now()
);
