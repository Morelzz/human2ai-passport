-- WARD Module 1 — schema dati (additivo, idempotente).
-- Riusa avatars/profiles (D6: niente protected_persons). Niente pgvector (D5).
-- Le scritture passano dal service role; gli utenti leggono solo le proprie righe (RLS in ward_module1_rls.sql).

-- Consenso di MONITORAGGIO (distinto dall'Art.9 di non-generazione gia' in consent_events).
create table if not exists monitoring_consents (
  id            uuid primary key default gen_random_uuid(),
  avatar_id     uuid not null references avatars(id) on delete cascade,
  scope         text not null default 'open_web',
  on_match      text not null default 'notify' check (on_match in ('notify','auto')),
  open_web      boolean not null default true,
  consent_doc_path text,
  granted_at    timestamptz not null default now(),
  expires_at    timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists monitoring_consents_avatar_idx on monitoring_consents(avatar_id);

-- Job di scansione (orchestrazione nel worker, piano successivo).
create table if not exists scan_jobs (
  id          uuid primary key default gen_random_uuid(),
  avatar_id   uuid not null references avatars(id) on delete cascade,
  status      text not null default 'queued' check (status in ('queued','running','done','error')),
  provider    text,
  stats       jsonb not null default '{}'::jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);
create index if not exists scan_jobs_avatar_idx on scan_jobs(avatar_id);

-- Candidati TRANSITORI: cancellati dopo il processing (data-minimization A2.3).
create table if not exists scan_candidates (
  id          uuid primary key default gen_random_uuid(),
  scan_job_id uuid not null references scan_jobs(id) on delete cascade,
  source_url  text not null,
  phash       text,
  status      text not null default 'pending',
  created_at  timestamptz not null default now()
);
create index if not exists scan_candidates_job_idx on scan_candidates(scan_job_id);

-- Match confermati/da-rivedere (mai i sotto-soglia).
create table if not exists scan_matches (
  id          uuid primary key default gen_random_uuid(),
  avatar_id   uuid not null references avatars(id) on delete cascade,
  scan_job_id uuid references scan_jobs(id) on delete set null,
  source_url  text not null,
  host        text,
  score       integer,
  band        text not null check (band in ('confirmed','review')),
  ai_verdict  text,
  sensitivity text not null default 'standard' check (sensitivity in ('standard','sensitive','minor')),
  phash       text,
  content_anchor text,
  created_at  timestamptz not null default now()
);
create index if not exists scan_matches_avatar_idx on scan_matches(avatar_id);

-- Evidenze (file nel bucket privato ward-evidence; qui i riferimenti).
create table if not exists evidence_records (
  id              uuid primary key default gen_random_uuid(),
  scan_match_id   uuid not null references scan_matches(id) on delete cascade,
  screenshot_path text,
  html_path       text,
  whois           jsonb,
  hash            text,
  anchored_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists evidence_records_match_idx on evidence_records(scan_match_id);

-- Fonti autorizzate per-avatar (allowlist: "questo uso e' lecito").
create table if not exists allowlist (
  id         uuid primary key default gen_random_uuid(),
  avatar_id  uuid not null references avatars(id) on delete cascade,
  host       text not null,
  reason     text,
  created_at timestamptz not null default now()
);
create index if not exists allowlist_avatar_idx on allowlist(avatar_id);

-- Azioni Nemesis (documenti DMCA / GDPR Art.17).
create table if not exists nemesis_actions (
  id            uuid primary key default gen_random_uuid(),
  scan_match_id uuid not null references scan_matches(id) on delete cascade,
  kind          text not null check (kind in ('dmca','gdpr17')),
  artifact_path text,
  status        text not null default 'drafted' check (status in ('drafted','sent','host_pending','removed','legal','escalated')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists nemesis_actions_match_idx on nemesis_actions(scan_match_id);

-- Audit log append-only (ogni scan, cambio consenso, decisione, azione).
create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      uuid,
  action     text not null,
  target     text,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log(created_at);
