-- FASE 1 — Modulo 3: Onboarding Seller
-- Collega ogni avatar al profilo del creatore che lo possiede.
-- Gli avatar demo restano con owner_id = null.

alter table avatars add column if not exists owner_id uuid references auth.users(id) on delete set null;
create index if not exists avatars_owner_idx on avatars(owner_id);
