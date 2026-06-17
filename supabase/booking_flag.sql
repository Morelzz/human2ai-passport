-- B3 (EXPANSION_V3): flag opt-in "disponibile per ingaggi reali" sul volto.
-- Additiva, dormiente di default (opt-in). RLS gia' attiva su avatars.
alter table avatars
  add column if not exists available_for_booking boolean not null default false;
