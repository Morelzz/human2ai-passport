-- FASE 2 — Modulo 6: struttura royalty (prezzo per categoria + ledger payout)
-- Modello: il buyer paga un LORDO per categoria; la piattaforma trattiene una fee;
-- il NETTO è la royalty accreditata all'avatar. Ogni payout viene tracciato.
-- Idempotente: rieseguibile senza danni.

-- 1) Dettaglio economico sul record di generazione.
--    royalty_cents resta = netto accreditato all'avatar (retro-compatibile).
alter table generations add column if not exists category   text;   -- categoria d'uso scelta
alter table generations add column if not exists gross_cents int not null default 0; -- pagato dal buyer
alter table generations add column if not exists fee_cents   int not null default 0; -- trattenuto dalla piattaforma

-- 2) Ledger dei payout: storico tracciabile (audit trail = fiducia).
--    status: 'paid' (mock attuale) | 'pending' | 'failed' quando arriverà Stripe.
create table if not exists payouts (
  id           uuid primary key default gen_random_uuid(),
  avatar_id    uuid not null references avatars(id) on delete cascade,
  amount_cents int  not null,
  status       text not null default 'paid',
  provider     text not null default 'mock',     -- 'mock' ora, 'stripe' poi
  provider_ref text,                              -- id del transfer sul provider
  created_at   timestamptz not null default now()
);

create index if not exists payouts_avatar_idx on payouts(avatar_id);
