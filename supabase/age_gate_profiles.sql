-- supabase/age_gate_profiles.sql
-- Age-gate 18+ (CRIT-10). Tre colonne su profiles (minimizzate) + estensione
-- del trigger handle_new_user per l'autodichiarazione al signup.

alter table profiles
  add column if not exists date_of_birth date,
  add column if not exists adult_verified_at timestamptz,
  add column if not exists adult_verified_method text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_adult_method_chk'
  ) then
    alter table profiles
      add constraint profiles_adult_method_chk
      check (adult_verified_method is null or adult_verified_method in ('self','document'));
  end if;
end $$;

-- Estende il trigger esistente: legge date_of_birth dal raw_user_meta_data
-- (options.data di signUp). Se presente e under-18 -> raise (account non creato).
-- Se presente e >= 18 -> scrive data + esito 'self'. Se assente -> nulla (il
-- gate a valle col prompt una-tantum gestira' l'account senza data).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
  v_dob_text text;
  v_dob date;
  v_age int;
begin
  v_role := case when new.raw_user_meta_data->>'role' = 'seller' then 'seller' else 'buyer' end;
  v_name := nullif(btrim(new.raw_user_meta_data->>'full_name'), '');

  v_dob_text := nullif(btrim(new.raw_user_meta_data->>'date_of_birth'), '');
  if v_dob_text is not null then
    begin
      v_dob := v_dob_text::date;
    exception when others then
      v_dob := null; -- formato non valido: trattato come assente (gate a valle)
    end;
  end if;

  if v_dob is not null then
    if v_dob > current_date then
      raise exception 'age_gate: data di nascita futura';
    end if;
    v_age := date_part('year', age(current_date, v_dob));
    if v_age < 18 then
      raise exception 'age_gate: under_18';
    end if;
  end if;

  insert into public.profiles (id, email, full_name, role, date_of_birth, adult_verified_at, adult_verified_method)
  values (
    new.id, new.email, v_name, v_role,
    v_dob,
    case when v_dob is not null then now() else null end,
    case when v_dob is not null then 'self' else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
