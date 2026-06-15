-- VOLT idempotente (hardening Fase 1, 2026-06-15).
-- Problema: grant_volt/spend_volt facevano insert incondizionato. Il bonus di
-- benvenuto e i rimborsi erano "controlla-poi-scrivi" con il controllo FUORI dal
-- lock (in app), quindi un doppio click admin o un retry potevano accreditare due
-- volte lo stesso movimento. Il path sync di /api/generate chiama refundVolt in
-- piu' rami con lo STESSO ref (gen:<id>): senza idempotenza era doppio storno.
--
-- Fix: (1) controllo di esistenza (user_id,type,ref) DENTRO l'advisory lock gia'
-- presente -> controllo e insert atomici per utente; (2) unique index PARZIALE come
-- rete di sicurezza a livello DB. admin_grant e' ESCLUSO: il suo ref e' la nota,
-- che puo' ripetersi legittimamente (due accrediti manuali con la stessa nota).
-- Additiva e idempotente (if not exists / create or replace): zero impatto sui dati.

-- (1) Rete di sicurezza DB: un (user,type,ref) non puo' ripetersi per i tipi
--     idempotenti. Tutti i ref non-admin sono unici per addebito (welcome una
--     volta per utente; ECHO:/tier: per gen/job; job:/gen: per rimborso).
create unique index if not exists volt_tx_idem
  on volt_transactions (user_id, type, ref)
  where ref is not null and type <> 'admin_grant';

-- (2) spend_volt idempotente: una spesa con lo stesso ref gia' registrata e' un
--     no-op (ritorna il saldo attuale, non riaddebita).
create or replace function spend_volt(p_user uuid, p_amount integer, p_ref text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    return -1;
  end if;
  perform pg_advisory_xact_lock(hashtext('volt:' || p_user::text));
  -- idempotenza: stesso addebito (ref) gia' presente -> nessun nuovo movimento
  if p_ref is not null and exists (
    select 1 from volt_transactions
    where user_id = p_user and type = 'generation' and ref = p_ref
  ) then
    select coalesce(sum(delta_volt), 0) into v_balance
      from volt_transactions where user_id = p_user;
    return v_balance;
  end if;
  select coalesce(sum(delta_volt), 0) into v_balance
    from volt_transactions where user_id = p_user;
  if v_balance < p_amount then
    return -1;
  end if;
  insert into volt_transactions (user_id, type, delta_volt, balance_after, ref)
    values (p_user, 'generation', -p_amount, v_balance - p_amount, p_ref);
  return v_balance - p_amount;
end;
$$;

-- (3) grant_volt idempotente per i tipi NON admin con un ref. admin_grant resta
--     ripetibile (accrediti manuali intenzionali con stessa nota).
create or replace function grant_volt(p_user uuid, p_amount integer, p_type text, p_ref text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 or p_type not in ('recharge','bonus','refund','admin_grant') then
    return -1;
  end if;
  perform pg_advisory_xact_lock(hashtext('volt:' || p_user::text));
  -- idempotenza: stesso (type,ref) gia' accreditato -> no-op (niente doppio bonus
  -- ne' doppio storno). admin_grant escluso: ref = nota, ripetibile.
  if p_ref is not null and p_type <> 'admin_grant' and exists (
    select 1 from volt_transactions
    where user_id = p_user and type = p_type and ref = p_ref
  ) then
    select coalesce(sum(delta_volt), 0) into v_balance
      from volt_transactions where user_id = p_user;
    return v_balance;
  end if;
  select coalesce(sum(delta_volt), 0) into v_balance
    from volt_transactions where user_id = p_user;
  insert into volt_transactions (user_id, type, delta_volt, balance_after, ref)
    values (p_user, p_type, p_amount, v_balance + p_amount, p_ref);
  return v_balance + p_amount;
end;
$$;

-- Le funzioni restano riservate al service role (create or replace conserva gli
-- ACL, ma le ri-revoco per sicurezza/idempotenza della migrazione).
revoke execute on function spend_volt(uuid, integer, text) from public, anon, authenticated;
revoke execute on function grant_volt(uuid, integer, text, text) from public, anon, authenticated;
