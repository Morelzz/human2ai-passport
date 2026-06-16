-- FASE 3.2 — KYB self-serve: estende organizations per la verifica azienda.
-- APPLICATA su prod il 2026-06-16 (migration: kyb_self_serve_org_fields).
-- org_id/verification_status (avatars) e kyb_status (organizations) esistono già
-- da enterprise.sql. RLS già attiva sulla tabella. Tutto additivo e idempotente.

alter table organizations add column if not exists vat_number       text;  -- P.IVA / reg. number
alter table organizations add column if not exists country          text;  -- giurisdizione
alter table organizations add column if not exists website          text;
alter table organizations add column if not exists contact_email    text;
alter table organizations add column if not exists kyb_submitted_at  timestamptz;
alter table organizations add column if not exists reviewed_at       timestamptz;
alter table organizations add column if not exists rejected_reason   text;

-- Stati KYB validi.
alter table organizations drop constraint if exists organizations_kyb_status_check;
alter table organizations add constraint organizations_kyb_status_check
  check (kyb_status in ('pending','approved','rejected'));

-- Coda admin per kyb_status.
create index if not exists organizations_kyb_status_idx on organizations(kyb_status);
