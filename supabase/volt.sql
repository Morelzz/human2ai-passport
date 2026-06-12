-- VOLT: crediti prepagati di HUMAN2AI (1 VOLT = 1 centesimo di euro).
-- Ledger APPEND-ONLY: il saldo e' la somma dei movimenti, mai una colonna
-- editabile a mano. Stesso principio del consent ledger: il registro e' la verita'.
-- I guadagni dei seller restano in EURO (tabelle payouts/royalty): i due flussi
-- non si toccano mai.

create table if not exists volt_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in ('recharge','generation','bonus','refund','admin_grant')),
  delta_volt    integer not null,           -- positivo = accredito, negativo = spesa
  balance_after integer not null,           -- saldo dopo il movimento (per lo storico)
  ref           text,                       -- id generazione, pacchetto, nota admin
  created_at    timestamptz not null default now()
);

create index if not exists volt_tx_user_idx on volt_transactions(user_id, created_at desc);

-- Nessuna policy client: scrive e legge SOLO il service role via API.
alter table volt_transactions enable row level security;

-- Saldo corrente: somma del ledger.
create or replace function volt_balance(p_user uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(delta_volt), 0)::integer
  from volt_transactions
  where user_id = p_user;
$$;

-- Spesa atomica: lock advisory per utente, verifica saldo, inserisce il movimento.
-- Ritorna il saldo dopo la spesa, oppure -1 se il saldo non basta.
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

-- Accredito atomico: ricarica, bonus di benvenuto, storno, accredito admin.
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
  select coalesce(sum(delta_volt), 0) into v_balance
    from volt_transactions where user_id = p_user;
  insert into volt_transactions (user_id, type, delta_volt, balance_after, ref)
    values (p_user, p_type, p_amount, v_balance + p_amount, p_ref);
  return v_balance + p_amount;
end;
$$;

-- Le funzioni le chiama solo il service role (le API), mai il client.
revoke execute on function volt_balance(uuid) from public, anon, authenticated;
revoke execute on function spend_volt(uuid, integer, text) from public, anon, authenticated;
revoke execute on function grant_volt(uuid, integer, text, text) from public, anon, authenticated;
