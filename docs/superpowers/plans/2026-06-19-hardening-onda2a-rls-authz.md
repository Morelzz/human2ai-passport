# Onda 2A: RLS per-riga + Audit autorizzazione. Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (o subagent-driven-development) per implementare task-by-task. Steps con checkbox `- [ ]`.

**Goal:** Far applicare al DATABASE la separazione dei dati per-utente (policy RLS per-riga, defense in depth) e garantire che ogni rotta che tocca dati per-utente verifichi la proprieta' (anti IDOR), senza rompere l'app che oggi legge via service-role.

**Architettura:** Aggiunta di policy RLS owner-scoped (additive: il service-role bypassa RLS, quindi nulla di esistente si rompe; il client autenticato guadagna la lettura scoping-per-proprietario) + audit sistematico delle rotte API/server action. Tutto su branch DB Supabase prima, poi prod, con verifica a terra tabella per tabella e rotta per rotta.

**Tech Stack:** Supabase Postgres (RLS, `auth.uid()`), Next.js 16 App Router (route handler + server action), `@supabase/ssr` (createAuthClient = client autenticato), `lib/supabase.ts` (createServerClient = service-role).

---

## Premesse (leggere prima)

- **Perche' e' sicuro/additivo:** oggi tutte le tabelle hanno RLS ON + 0 policy (deny-by-default per anon/authenticated) e l'app funziona perche' legge via **service-role** (`createServerClient`), che **bypassa** RLS. Aggiungere una policy `for select to authenticated using (auth.uid() = <owner>)` NON restringe il service-role e NON tocca l'anon (che gia' non vede nulla e continua cosi'): AGGIUNGE solo, al client autenticato, la lettura delle PROPRIE righe. Quindi non puo' rompere flussi esistenti.
- **Cosa NON facciamo qui (per non rischiare):** non spostiamo (ancora) le letture da service-role a client autenticato. Quello e' il passo che "forza" il DB a fare enforcement ed e' piu' delicato: lo valutiamo dopo, rotta per rotta, sulla base dell'audit (Task 3). 2A mette la rete (policy) e chiude i buchi di codice (audit).
- **Verifica RLS a terra:** la si prova impersonando un utente in una transazione (`set local role authenticated` + claim `sub`). Se il ruolo del MCP non puo' fare `set role`, si verifica via app (login utente reale + lettura client autenticato). Entrambe descritte sotto.
- **Vincoli:** push/deploy SOLO a "pubblica"; migrazioni applicate da Claude con `apply_migration`, SQL mostrato prima e schema verificato dopo (`get_advisors`/`execute_sql`); DB condiviso = PROD vivo, ogni migrazione additiva; commit italiano senza trattini lunghi + trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`; verifica a terra a ogni passo. Branch git `sicurezza-onda2a` (master pulito).

### Mappa proprietario (dallo schema live, 2026-06-19)
| Tabella | Colonna proprietario | Policy gia' presente |
|---|---|---|
| profiles | `id` (= auth.uid) | si' (select/update own) |
| generation_jobs | `buyer_id` | si' (select own) |
| avatars | `owner_id` | no |
| generations | `buyer_id` | no |
| volt_transactions | `user_id` | no |
| match_alerts | `buyer_id` | no |
| organizations | `owner_id` | no |
| progressi | `utente` (PK utente+lezione) | no |
| certificazioni | `utente` | no |
| consent_events | via `avatars.owner_id` (avatar_id) | no |
| payouts | via `avatars.owner_id` (avatar_id) | no |

Tabelle che RESTANO deny-by-default (solo service-role/admin; INSERT pubblici passano da rotte service-role): blocked_requests, partner_applications, business_inquiries, contact_messages, match_searches, abuse_reports, protection_alerts. Cataloghi pubblici (sedi, corsi, lezioni): restano serviti da service-role (non aggiungiamo policy pubbliche se non servono; verificare in Task 2 che le pagine pubbliche non leggano direttamente da anon).

---

## Task 1: Policy RLS owner-scoped (migrazione additiva)

**Files:** Migrazione DB (applicata da Claude). Nessun file di codice.

- [ ] **Step 1: Mostrare l'SQL a Morelz, poi applicare su branch DB**

Creare un branch Supabase (`create_branch`) per provare la migrazione, oppure applicarla direttamente con cautela (additiva). SQL della migrazione `rls_owner_policies`:

```sql
-- avatars: il proprietario (seller) vede e aggiorna il proprio avatar.
create policy "avatars_select_own" on public.avatars
  for select to authenticated using (auth.uid() = owner_id);
create policy "avatars_update_own" on public.avatars
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- generations: il compratore vede le proprie generazioni.
create policy "generations_select_own" on public.generations
  for select to authenticated using (auth.uid() = buyer_id);

-- volt_transactions: l'utente vede il proprio storico crediti.
create policy "volt_tx_select_own" on public.volt_transactions
  for select to authenticated using (auth.uid() = user_id);

-- match_alerts: il compratore vede i propri alert.
create policy "match_alerts_select_own" on public.match_alerts
  for select to authenticated using (auth.uid() = buyer_id);

-- organizations: il titolare vede e aggiorna la propria organizzazione.
create policy "organizations_select_own" on public.organizations
  for select to authenticated using (auth.uid() = owner_id);
create policy "organizations_update_own" on public.organizations
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- progressi (academy): l'utente vede il proprio progresso.
create policy "progressi_select_own" on public.progressi
  for select to authenticated using (auth.uid() = utente);

-- certificazioni: l'utente vede le proprie certificazioni.
create policy "certificazioni_select_own" on public.certificazioni
  for select to authenticated using (auth.uid() = utente);

-- consent_events: proprieta' transitiva via avatar.
create policy "consent_events_select_via_avatar" on public.consent_events
  for select to authenticated using (
    exists (select 1 from public.avatars a where a.id = consent_events.avatar_id and a.owner_id = auth.uid())
  );

-- payouts: proprieta' transitiva via avatar.
create policy "payouts_select_via_avatar" on public.payouts
  for select to authenticated using (
    exists (select 1 from public.avatars a where a.id = payouts.avatar_id and a.owner_id = auth.uid())
  );
```

Applicare con `apply_migration` (nome: `rls_owner_policies`).

- [ ] **Step 2: Verifica schema (le policy esistono)**

Run (`execute_sql`):
```sql
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;
```
Expected: compaiono le 12 nuove policy + le 3 preesistenti (profiles x2, generation_jobs x1).

- [ ] **Step 3: Verifica RLS a terra (negazione cross-utente) via impersonazione**

Procurarsi due utenti reali e un avatar/generazione di prova:
```sql
SELECT id FROM auth.users LIMIT 2;            -- userA, userB
SELECT id, owner_id FROM public.avatars WHERE owner_id IS NOT NULL LIMIT 1;  -- avatarX di ownerX
```
Poi, in transazione, impersonare userA e leggere `avatars` (deve vedere SOLO i propri):
```sql
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"<userA-uuid>"}';
select count(*) as visibili_da_A from public.avatars;             -- solo gli avatar di A
select count(*) as totali from public.avatars;                    -- (confronto: stesso conteggio = NON scoping)
rollback;
```
Expected: `visibili_da_A` <= totali e pari al numero di avatar realmente di A (per un utente senza avatar: 0). Ripetere il test puntato: impersonando un utente che NON possiede `avatarX`, `select * from public.avatars where id='<avatarX>'` deve dare **0 righe**; impersonando `ownerX`, **1 riga**.

> NB executor: se il ruolo del MCP non consente `set local role authenticated` (errore permessi), eseguire questa verifica nel SQL editor della dashboard Supabase (che supporta l'impersonazione) oppure via app (Step 4). NON dare per verificata la RLS senza una prova di negazione cross-utente (lezione: non fidarsi di un solo segnale).

- [ ] **Step 4: Verifica che l'app NON si rompa (smoke test flussi service-role)**

Con dev server attivo e login del seller di test (`test-card-e3@h2ai.dev`): aprire `/account` (i miei contenuti), `/account/avatar` (il proprio avatar), `/studio/edit` (galleria), e fare una generazione. Tutto deve funzionare come prima (questi flussi passano da rotte service-role, immuni alle policy).
Run a terra: `curl -sI http://localhost:3000/account` (200 dopo login) + verifica nel log che le route rispondano 200.
Expected: nessuna regressione; le pagine mostrano i dati come prima.

- [ ] **Step 5: get_advisors security**

Run: `get_advisors(type=security)`.
Expected: le tabelle con le nuove policy NON sono piu' `rls_enabled_no_policy`; nessun nuovo WARN/ERROR introdotto. Le tabelle lasciate deny-by-default restano `rls_enabled_no_policy` (stato sano voluto).

- [ ] **Step 6: Commit (solo doc/nessun codice) + nota**

Le policy sono nel DB (migrazione). Nessun file di codice cambia in questo task. Registrare l'esito (policy applicate + verifica cross-utente) nella PR/handoff. Se in seguito si crea un file SQL di riferimento in `supabase/`, committarlo con messaggio dedicato.

---

## Task 2: Audit di autorizzazione delle rotte (anti IDOR)

Il vero rischio "dati tra utenti" vive nelle rotte che usano il **service-role** (bypassa RLS) con un id fornito dall'utente: se non controllano la proprieta', un utente puo' leggere/modificare risorse altrui. Questo task le passa in rassegna in modo sistematico.

**Files:** Lettura di tutte le `app/api/**/route.ts` e delle server action; modifica SOLO delle rotte che risultano carenti.

- [ ] **Step 1: Inventario delle rotte per rischio**

Categorie (dalla struttura `app/api/`):
- **A. Prendono un id/handle/cert dall'utente e ritornano/mutano dati legati a una persona** (DA VERIFICARE con cura): `consent/[token]`, `generate/job/[id]`, `content/[cert]`, `receipt/[cert]`, `sample/[handle]/[index]`, `nft/identity/[id]`, `badge/[handle]`, `avatar/wallet`, `avatar/booking`, `avatar/consent`, `avatar/soul`, `avatar/create`, `edit/save`, `edit/render`, `volt`, `payout`, `kyc/submit`, `enterprise/register`, `match/alert`.
- **B. Admin (devono richiedere ruolo admin):** `admin/soul-ids`, `admin/review`, `admin/reports`, `admin/anchor`, `admin/face-index`, `admin/volt`, `admin/kyc`, `admin/kyb`.
- **C. Pubbliche/sistema (nessun dato per-utente da proteggere, ma controllare rate-limit/abuso):** `match`, `filter`, `poses`, `contact`, `partner/apply`, `business/inquiry`, `scan/booking`, `veto/register`, `report`, `verify`, `verify-image`, `verify-face`, `enhance-prompt`, `jobs/run`, `dev/stego-selftest`, `echo-test`.

- [ ] **Step 2: Per ogni rotta di gruppo A, verificare il pattern proprieta'**

Leggere il file e confermare che, dopo l'autenticazione, la rotta verifichi che la risorsa appartenga all'utente. Pattern atteso (esempio per una rotta che mostra/modifica un avatar via id):
```ts
const auth = await createAuthClient();
const { data: { user } } = await auth.auth.getUser();
if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

const admin = createServerClient();
const { data: avatar } = await admin.from("avatars").select("owner_id").eq("id", avatarId).single();
if (!avatar || avatar.owner_id !== user.id) {
  return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
}
// ...prosegue solo se proprietario
```
Per ogni rotta del gruppo A creare una riga di esito: OK (gia' controlla) / DA CORREGGERE (manca il check) con il numero di riga.

- [ ] **Step 3: Per ogni rotta di gruppo B, verificare il gate admin**

Pattern atteso:
```ts
const auth = await createAuthClient();
const { data: { user } } = await auth.auth.getUser();
if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });
const admin = createServerClient();
const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
if (profile?.role !== "admin") return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
```
Esito per ognuna: OK / DA CORREGGERE.

- [ ] **Step 4: Correggere le rotte carenti**

Per ogni rotta marcata DA CORREGGERE, applicare il pattern del gruppo corrispondente (Step 2 o 3), riusando le risposte di errore gia' presenti nel file. Una rotta = una modifica mirata. Committare a gruppi coerenti (es. "Sicurezza Onda 2A: gate proprieta' su <rotte>").

- [ ] **Step 5: Verifica a terra (negazione cross-utente sulle rotte corrette)**

Per ogni rotta corretta del gruppo A: con due utenti (A proprietario, B no), chiamare la rotta come B sulla risorsa di A e verificare **403/404**; come A, **200**. Per il gruppo B: chiamare come utente non-admin e verificare **403**.
Run: `npx tsc --noEmit && npm run build` verdi a fine task.

- [ ] **Step 6: Commit**

```bash
git add <file delle rotte corrette>
git commit -m "Sicurezza Onda 2A: gate di proprieta'/ruolo sulle rotte carenti (anti IDOR)" -m "<elenco rotte corrette e cosa mancava>" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: (Decisione, non codice) migrazione letture a client autenticato

**Files:** Nessuno in 2A. Solo decisione documentata.

- [ ] **Step 1: Annotare quali letture per-utente conviene spostare da service-role a client autenticato**

Sulla base dell'audit (Task 2), elencare le rotte/letture dove usare il **client autenticato** (cosi' la RLS del Task 1 fa enforcement nel DB, non solo il codice) ha senso e basso rischio (es. `/account` letture delle proprie generazioni/avatar). NON eseguire la migrazione in 2A: e' un cambiamento piu' profondo, va fatto rotta per rotta con verifica, in un task successivo dedicato. Registrare l'elenco come follow-up.

---

## Fuori scope (Piano 2B, separato)
- Audit log degli accessi ai dati biometrici (tabella `access_log` append-only + scrittura sui download di documents/face-index/references).
- 2FA/MFA (Supabase Auth TOTP) per admin/enterprise/seller.
- Hardening signed URL (scadenza breve, generazione on-demand dopo check proprieta') per i bucket privati.

## Self-review (esito)
- **Copertura spec sez. 6:** misura 1 (RLS per-riga) = Task 1; misura 2 (audit autorizzazione) = Task 2; le misure 3/4/5 (audit log, 2FA, signed URL) sono esplicitamente nel Piano 2B separato (scope split come da skill). Task 3 cattura la migrazione-letture come follow-up esplicito.
- **Placeholder:** le policy SQL sono complete e concrete (colonne reali dallo schema live); l'audit ha inventario reale delle rotte + pattern di codice completo. L'unico elemento "a runtime" e' la lista esiti dell'audit, che e' la natura del task (revisione), con metodo e fix template concreti.
- **Coerenza:** colonne proprietario verificate sullo schema live (owner_id/buyer_id/user_id/utente; consent_events e payouts via avatars.owner_id); pattern `auth.uid() = <col>` coerente con le policy preesistenti (profiles, generation_jobs).
- **Sicurezza del piano:** Task 1 e' additivo (non rompe i flussi service-role); il rischio reale (IDOR nelle rotte service-role) e' coperto dal Task 2; la parte piu' delicata (spostare le letture al client autenticato) e' deliberatamente rimandata (Task 3 = decisione).
