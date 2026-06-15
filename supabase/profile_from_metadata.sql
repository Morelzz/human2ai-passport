-- Signup robusto (hardening Fase 1, 2026-06-15).
-- Bug: la pagina signup faceva un UPDATE profiles(role, full_name) sotto il client
-- ANON subito dopo signUp. Con la conferma email attiva non c'e' sessione, quindi
-- la RLS profiles_update_own (auth.uid() = id) bloccava l'update a 0 righe IN
-- SILENZIO -> il seller perdeva role e nome e restava buyer, senza funnel KYC/avatar.
--
-- Fix: il trigger handle_new_user popola role e full_name dal raw_user_meta_data
-- (options.data di signUp) al momento della creazione utente. Niente piu' UPDATE
-- lato client. Sicurezza: dal metadata si accetta SOLO buyer/seller, mai admin/
-- enterprise (quelli si impostano solo via seed/operatore).
-- Idempotente (create or replace): sostituisce solo il corpo del trigger esistente.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
begin
  -- role: solo buyer/seller dal metadata; qualsiasi altro valore -> buyer.
  v_role := case when new.raw_user_meta_data->>'role' = 'seller' then 'seller' else 'buyer' end;
  v_name := nullif(btrim(new.raw_user_meta_data->>'full_name'), '');
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, v_name, v_role)
  on conflict (id) do nothing;
  return new;
end;
$$;
