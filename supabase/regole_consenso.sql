-- ──────────────────────────────────────────────────────────────────────────
-- IL CONSENSO CHE SI LEGGE (23/9/2026)
--
-- Fino a oggi il consenso di una persona era si' o no all'uso commerciale.
-- Adesso ognuno puo' scrivere a parole i suoi limiti ("niente alcol, niente
-- politica, niente intimo, si' alle auto"), e prima che il motore parta un
-- giudice legge la scena contro quelle regole. Se la scena le tocca, lo scatto
-- non parte e chi compra legge il perche'.
--
-- Da incollare nel SQL Editor di Supabase (progetto H2AI), tutto insieme.
-- Dopo lock_avatar_profile_privileges.sql: la colonna la scrive solo il server,
-- come tutto il resto del volto.
-- ──────────────────────────────────────────────────────────────────────────

begin;

alter table public.avatars add column if not exists regole text;
alter table public.avatars add column if not exists regole_aggiornate_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'avatars_regole_len') then
    alter table public.avatars add constraint avatars_regole_len check (regole is null or char_length(regole) <= 600);
  end if;
end $$;

-- Il registro dei blocchi conosce il nuovo motivo: 'rules_excluded' (la scena
-- tocca una regola scritta dalla persona). Si ricrea il CHECK con TUTTI i
-- motivi gia' in uso, cosi' nessuno si perde.
alter table public.blocked_requests drop constraint if exists blocked_requests_reason_check;
alter table public.blocked_requests add constraint blocked_requests_reason_check
  check (reason in ('no_match','category_excluded','category_not_approved','revoked','protected_face',
                    'no_commercial_consent','age_no_dob','age_under_18','no_video_consent','rules_excluded'));

commit;
