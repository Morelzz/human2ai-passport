-- FASE 1 — Modulo 1: profili utente + ruoli
-- Collega ogni utente di Supabase Auth a un profilo con ruolo e stato KYC.

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'buyer' check (role in ('buyer','seller','admin')),
  kyc_status  text not null default 'none'  check (kyc_status in ('none','pending','approved','rejected')),
  created_at  timestamptz not null default now()
);

-- Crea automaticamente un profilo quando nasce un nuovo utente Auth
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Row Level Security: ognuno vede e modifica solo il proprio profilo
alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);
