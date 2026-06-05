-- FASE 2 — Modulo 10: Segnalazione abuso / takedown (pilastro enforcement)
-- Chiunque (anche senza account) può segnalare un avatar o un contenuto generato.
-- Le segnalazioni entrano in una coda che gli operatori (role 'admin') revisionano.
-- Se accolta, l'operatore può sospendere l'avatar (verification_status='rejected'):
-- la rimozione dal registro pubblico è prospettica, coerente con la logica di consenso.
-- Nessun dato biometrico — solo riferimenti (id avatar, certificato, handle) e testo.
-- Idempotente.

create table if not exists abuse_reports (
  id             uuid primary key default gen_random_uuid(),
  target_type    text not null check (target_type in ('avatar','content')),
  avatar_id      uuid references avatars(id) on delete set null,  -- risolto lato server
  certificate    text,                       -- certificato del contenuto segnalato (se 'content')
  handle         text,                       -- snapshot leggibile dell'avatar segnalato
  reason         text not null check (reason in ('no_consent','impersonation','misuse','illegal','other')),
  details        text,
  reporter_email text,                        -- opzionale, per ricontatto
  status         text not null default 'open' check (status in ('open','reviewing','upheld','dismissed')),
  resolution     text,                        -- nota dell'operatore alla chiusura
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

create index if not exists abuse_reports_status_idx on abuse_reports(status, created_at);
create index if not exists abuse_reports_avatar_idx on abuse_reports(avatar_id);
