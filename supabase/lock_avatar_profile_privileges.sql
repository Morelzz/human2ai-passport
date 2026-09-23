-- ──────────────────────────────────────────────────────────────────────────
-- SICUREZZA (23/9/2026): CHIUDE QUATTRO FALLE VIVE SU PROFILI E VOLTI.
-- Da incollare nel SQL Editor di Supabase (progetto H2AI). URGENTE.
--
-- Le policy profiles_update_own e avatars_update_own lasciano che ogni utente
-- registrato modifichi la PROPRIA riga direttamente, col suo accesso, senza
-- passare dal sito. Nel giugno scorso su profiles si erano bloccati solo role e
-- kyc_status (lock_profile_privileges.sql). Tutto il resto era aperto. Provato
-- il 23/9 con l'account demo, e rimesso subito com'era:
--
--  1. avatars.royalty_accrued_cents: da 0 a 999.999 centesimi (9.999 euro di
--     guadagni inventati, con il tasto "ritira" che si accende);
--  2. avatars.usage_count: da 0 a 99.999 (popolarita' finta sul catalogo);
--  3. profiles.identity_face_descriptor: l'impronta del "volto verificato".
--     Chi ci scrive quella di un'altra persona (la si ricava da una foto
--     pubblica) poi registra IL SUO volto come proprio e il controllo passa;
--  4. profiles.adult_verified_at / date_of_birth / adult_verified_method: il
--     cancello dei 18 anni si apriva scrivendosi il timbro da soli.
--  (in piu': kyc_provider, identity_session_id, email.)
--
-- Nessuna pagina del sito scrive su queste tabelle col token dell'utente:
-- controllato il 23/9, ogni scrittura passa dal server con la chiave di
-- servizio. Quindi si chiude tutto, e si lascia aperto solo il proprio nome.
--
-- Sul sito sono gia' pubblicate le difese che non aspettano questo file (il
-- payout paga il registro e non il contatore, l'impronta si ricava sempre dalla
-- verifica, l'eta' la decide la data di nascita). Questo file chiude la porta.
-- Idempotente: si puo' incollare due volte.
-- ──────────────────────────────────────────────────────────────────────────

begin;

-- ── PROFILI: dal browser si cambia solo il proprio nome ─────────────────────
create or replace function lock_profile_privileges()
returns trigger
language plpgsql
as $$
declare
  v_nome text;
begin
  -- current_user = il ruolo con cui PostgREST esegue la richiesta:
  -- 'anon'/'authenticated' per gli utenti, 'service_role' per il server.
  if current_user in ('anon', 'authenticated') then
    v_nome := new.full_name;
    new := old;              -- tutto torna com'era...
    new.full_name := v_nome; -- ...tranne il nome, l'unica cosa davvero sua da cambiare
  end if;
  return new;
end;
$$;

drop trigger if exists lock_profile_privileges on public.profiles;
create trigger lock_profile_privileges
  before update on public.profiles
  for each row execute function lock_profile_privileges();

-- ── VOLTI: dal browser non si cambia niente ────────────────────────────────
-- Soldi (royalty), popolarita' (utilizzi), consenso, revoca, verifica, chiavi:
-- ogni colonna di un volto la scrive solo il server.
create or replace function lock_avatar_privileges()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    return old; -- nessuna modifica passa
  end if;
  return new;
end;
$$;

drop trigger if exists lock_avatar_privileges on public.avatars;
create trigger lock_avatar_privileges
  before update on public.avatars
  for each row execute function lock_avatar_privileges();

-- E la porta stessa: una policy che dava un potere che il sito non usa.
drop policy if exists avatars_update_own on public.avatars;

commit;

-- ── Per controllare che abbia funzionato (facoltativo) ──────────────────────
-- select tgname from pg_trigger where tgname in ('lock_profile_privileges','lock_avatar_privileges');
-- -> devono uscire due righe.
