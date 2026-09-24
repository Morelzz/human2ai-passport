-- SEMBLIC, da incollare TUTTO INSIEME nel SQL Editor di Supabase (24/9/2026).
-- Quattro parti in ordine, ognuna nella sua transazione: se una fallisce le altre restano.
-- 1 lucchetto su profili e volti (URGENTE)  2 progetti  3 inviti  4 regole scritte del consenso


-- ======================= lock_avatar_profile_privileges.sql =======================

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

-- ======================= progetti.sql =======================

-- ──────────────────────────────────────────────────────────────────────────
-- CARTELLE PROGETTO E LINK PER IL CLIENTE (22/9/2026)
--
-- Chi lavora con Semblic non fa uno scatto: ne fa venti per una campagna, e poi
-- deve farli vedere a qualcuno che non ha un account. Oggi li manda per email
-- uno per uno, e la prova di consenso resta indietro.
--
-- Una cartella raccoglie gli scatti di chi li ha comprati e, se lui vuole, si
-- apre con un indirizzo pubblico difficile da indovinare: chi lo riceve vede le
-- foto, chi c'e' dentro e cosa ha autorizzato. Il link si spegne quando vuole.
--
-- Da incollare nel SQL Editor di Supabase (progetto H2AI), tutto insieme.
-- ──────────────────────────────────────────────────────────────────────────

begin;

create table if not exists public.progetti (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  cliente text check (char_length(cliente) <= 80),
  nota text check (char_length(nota) <= 500),
  -- l'indirizzo pubblico: casuale, lungo, e si puo' spegnere senza perderlo
  slug text unique not null,
  link_attivo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists progetti_owner_idx on public.progetti (owner_id, created_at desc);
create index if not exists progetti_slug_idx on public.progetti (slug) where link_attivo;

create table if not exists public.progetto_contenuti (
  progetto_id uuid not null references public.progetti(id) on delete cascade,
  generation_id uuid not null references public.generations(id) on delete cascade,
  posizione int not null default 0,
  created_at timestamptz not null default now(),
  primary key (progetto_id, generation_id)
);

create index if not exists progetto_contenuti_idx on public.progetto_contenuti (progetto_id, posizione);

-- ── Chi puo' vedere cosa ────────────────────────────────────────────────────
-- Di suo, nessuno: le pagine pubbliche passano dal server con la chiave di
-- servizio, che controlla link_attivo. Dal browser un utente vede e cambia solo
-- le PROPRIE cartelle.
alter table public.progetti enable row level security;
alter table public.progetto_contenuti enable row level security;

drop policy if exists progetti_propri on public.progetti;
create policy progetti_propri on public.progetti
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists progetto_contenuti_propri on public.progetto_contenuti;
create policy progetto_contenuti_propri on public.progetto_contenuti
  for all using (
    exists (select 1 from public.progetti p where p.id = progetto_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.progetti p where p.id = progetto_id and p.owner_id = auth.uid())
  );

commit;

-- ======================= inviti.sql =======================

-- ──────────────────────────────────────────────────────────────────────────
-- INVITA UN AMICO (23/9/2026)
--
-- Il premio e' in VOLT, mai in contanti, e arriva SOLO quando entrano soldi
-- veri (una ricarica), non quando si apre un account: altrimenti il programma
-- pagherebbe chi crea dieci caselle di posta.
--   · chi invita: 20% di ogni ricarica dell'invitato, per 12 mesi;
--   · l'invitato: 10% in piu' sulla sua prima ricarica.
--
-- Da incollare nel SQL Editor di Supabase (progetto H2AI), tutto insieme.
-- ──────────────────────────────────────────────────────────────────────────

begin;

-- Il codice da dare agli amici. Si crea la prima volta che uno apre la scheda
-- "Invita": chi non invita nessuno non ha nemmeno un codice.
alter table public.profiles add column if not exists invite_code text;
create unique index if not exists profiles_invite_code_idx on public.profiles (invite_code) where invite_code is not null;

create table if not exists public.inviti (
  -- uno si fa invitare UNA volta sola: la chiave e' l'invitato
  invitato_id uuid primary key references auth.users(id) on delete cascade,
  invitante_id uuid not null references auth.users(id) on delete cascade,
  codice text not null,
  created_at timestamptz not null default now(),
  scade_il timestamptz not null,
  prima_ricarica_fatta boolean not null default false,
  volt_guadagnati int not null default 0,
  -- nessuno invita se stesso
  constraint inviti_non_se_stesso check (invitato_id <> invitante_id)
);

create index if not exists inviti_invitante_idx on public.inviti (invitante_id, created_at desc);

alter table public.inviti enable row level security;

-- Dal browser si vedono solo i propri inviti (quelli fatti e quello ricevuto).
-- Chi scrive e' sempre il server con la chiave di servizio: un premio non si
-- accredita da soli.
drop policy if exists inviti_miei on public.inviti;
create policy inviti_miei on public.inviti
  for select using (auth.uid() = invitante_id or auth.uid() = invitato_id);

commit;

-- ======================= regole_consenso.sql =======================

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
