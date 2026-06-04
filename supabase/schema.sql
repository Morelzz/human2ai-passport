-- Tabella principale degli avatar
create table if not exists avatars (
  id                   uuid primary key default gen_random_uuid(),
  handle               text unique not null,
  alias                text not null,
  portrait_url         text,
  tier                 text not null check (tier in ('SPARK','SHAPE','SOUL','HUMAN')),
  gender               text,
  age_range            text,
  ethnicity            text,
  hair_color           text,
  body_type            text,
  approved_categories  text[] not null default '{}',
  excluded_categories  text[] not null default '{}',
  consent_start        date not null,
  consent_end          date,
  revoked_at           date,
  token_hash           text not null,
  usage_count          int not null default 0,
  royalty_accrued_cents int not null default 0,
  is_demo              boolean not null default false,
  created_at           timestamptz not null default now()
);

-- Timeline degli eventi di consenso
create table if not exists consent_events (
  id          uuid primary key default gen_random_uuid(),
  avatar_id   uuid not null references avatars(id) on delete cascade,
  event_type  text not null check (event_type in ('GRANTED','CATEGORY_ADDED','CATEGORY_REMOVED','REVOKED')),
  detail      text,
  occurred_at date not null
);
