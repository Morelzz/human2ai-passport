-- ANIMA (19/9/2026): lo scatto certificato diventa un video breve (Seedance 2.5
-- via Higgsfield API). Additiva, nessuna modifica distruttiva. Si applica solo
-- a "applica" di Morelz.

-- 1) Consenso al video, SEPARATO dal consenso commerciale all'immagine.
--    Default NO per tutti: ai founder lo accende Morelz dopo averli sentiti.
alter table avatars add column if not exists video_consent boolean not null default false;
alter table avatars add column if not exists video_consent_at timestamptz;

comment on column avatars.video_consent is
  'Si al video (Anima): separato dal consenso commerciale all''immagine. Default no; si revoca come l''altro.';
comment on column avatars.video_consent_at is
  'Quando la persona ha detto si al video (NULL = mai).';

-- 2) I video. Uno per richiesta; nascono da una generazione certificata del buyer.
create table if not exists animations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  avatar_id uuid not null references avatars(id),
  source_generation_id uuid not null references generations(id),
  engine text not null default 'seedance-2.5',
  provider_request_id text,
  -- running = inviato al motore; finishing = una richiesta sta copiando il video (evita doppi accrediti)
  status text not null default 'running' check (status in ('running','finishing','done','error')),
  error text,
  movement text not null,
  seconds integer not null,
  video_url text,
  certificate text unique,
  gross_cents integer not null,
  fee_cents integer not null,
  royalty_cents integer not null,
  cost_cents integer not null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists animations_buyer_idx on animations (buyer_id, created_at desc);
create index if not exists animations_source_idx on animations (source_generation_id);

-- RLS: il buyer vede solo i suoi video; scrive solo il server (service role).
alter table animations enable row level security;
drop policy if exists animations_own_select on animations;
create policy animations_own_select on animations
  for select using ((select auth.uid()) = buyer_id);

-- 3) Il registro dei blocchi conosce Anima: fonte 'anima' e motivo
--    'no_video_consent'. Si ricrea il CHECK con TUTTI i motivi gia' in uso nel
--    codice (lib/blocked.ts), cosi' nessun motivo esistente viene perso.
alter table blocked_requests drop constraint if exists blocked_requests_source_check;
alter table blocked_requests add constraint blocked_requests_source_check
  check (source in ('match','generate','anima'));
alter table blocked_requests drop constraint if exists blocked_requests_reason_check;
alter table blocked_requests add constraint blocked_requests_reason_check
  check (reason in ('no_match','category_excluded','category_not_approved','revoked','protected_face',
                    'no_commercial_consent','age_no_dob','age_under_18','no_video_consent'));
