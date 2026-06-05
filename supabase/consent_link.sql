-- FASE 2 — Modulo 9: consenso "persona-nel-loop" (Enterprise)
-- L'organizzazione avvia l'onboarding, ma la PERSONA conferma il consenso in
-- prima persona aprendo un link tokenizzato. L'agenzia non consente al posto suo.
-- Idempotente.

alter table avatars add column if not exists consent_token text;
alter table avatars add column if not exists person_consented_at timestamptz;
create unique index if not exists avatars_consent_token_idx on avatars(consent_token) where consent_token is not null;
