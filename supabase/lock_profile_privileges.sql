-- SICUREZZA (hardening Fase 1, 2026-06-15) — chiude una privilege escalation LIVE.
-- La policy RLS profiles_update_own permette all'utente di aggiornare il PROPRIO
-- profilo, ma non restringe le colonne: con il check constraint che ammette 'admin',
-- un utente autenticato poteva fare PATCH /rest/v1/profiles {role:'admin'} sul
-- proprio id e diventare admin (-> coda KYC con i documenti di tutti, report,
-- accredito VOLT admin = credito gratis). Stesso rischio su kyc_status (auto-approvarsi).
--
-- Fix: un trigger BEFORE UPDATE che, SOLO per i ruoli utente (anon/authenticated
-- via PostgREST), tiene role e kyc_status invariati. Il service_role (le API admin)
-- e il postgres (SQL manuale dalla dashboard) restano liberi di cambiarli.
-- Idempotente.

create or replace function lock_profile_privileges()
returns trigger
language plpgsql
as $$
begin
  -- current_user = ruolo impostato da PostgREST per la richiesta: 'authenticated'
  -- o 'anon' per gli utenti finali, 'service_role' per le API server.
  if current_user in ('anon', 'authenticated') then
    new.role := old.role;
    new.kyc_status := old.kyc_status;
  end if;
  return new;
end;
$$;

drop trigger if exists lock_profile_privileges on profiles;
create trigger lock_profile_privileges
  before update on profiles
  for each row execute function lock_profile_privileges();
