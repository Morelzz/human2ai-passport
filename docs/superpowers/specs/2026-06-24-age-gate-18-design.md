# Age-gate 18+ (CRIT-10) — Design

Data: 2026-06-24
Stato: in revisione (brainstorming completato, mockup approvati)
Origine: rilievo CRIT-10 dell'audit `SEMBLIC_AUDIT_TECNICO_UX.md`, ultimo punto rimasto della bonifica sicurezza pubblicata il 2026-06-24 (`master` = `bf052aa`).

## Problema

SEMBLIC custodisce volti di persone reali e permette di generare immagini e video a partire da quei volti. Oggi non esiste alcun controllo di maggiore età: la data di nascita non viene catturata da nessuna parte (nessuna colonna su `profiles`, nessun campo estratto da Didit). Due rischi, in ordine di gravità:

1. Un minore registrato come avatar, cioè un volto di minore che entra nel registro e diventa generabile. È il rischio più grave.
2. Un minore che semplicemente usa la piattaforma (crea un account, genera).

## Decisioni prese (brainstorming)

- **Livello di assurance: a strati.** Autodichiarazione leggera per l'accesso, verità documentale dove conta (chi mette il proprio volto nel registro).
- **Posizione dello strato leggero: a iscrizione / azione.** Nessun muro all'ingresso per i visitatori anonimi (il catalogo pubblico resta navigabile). La data di nascita si chiede al signup; siccome generare richiede già il login, questo copre di fatto tutte le azioni sensibili.

## I due strati

### Strato 1 — autodichiarazione (signup)

Campo data di nascita obbligatorio nel form di signup. L'età si calcola lato server, gli under-18 vengono bloccati. Tre punti di enforcement, in profondità e fail-closed:

1. **Client (UX):** il form richiede la data e mostra subito la schermata di blocco se la data inserita è da minorenne. Non è una garanzia di sicurezza, solo attrito e chiarezza.
2. **Trigger DB (autoritativo):** `handle_new_user` viene esteso per leggere `date_of_birth` dal `raw_user_meta_data`. Se la data è presente e indica un under-18, `raise exception` e la creazione utente fallisce. Se presente e >= 18, scrive `date_of_birth`, `adult_verified_at = now()`, `adult_verified_method = 'self'`. Se assente, non scrive nulla (gestione a valle).
3. **Gate a valle (difesa in profondità):** ogni azione sensibile passa da `adultGateReason(profile)` (vedi sotto), che blocca chi non risulta adulto verificato.

Nota: il trigger blocca solo quando la data è presente e under-18. Il caso "data assente" (signup non standard, account esistenti) non viene bloccato qui ma a valle, col prompt una-tantum. Così non rompiamo seed, eventuali OAuth o creazioni da operatore.

### Strato 2 — documentale (avatar / seller)

Chi diventa avatar passa già dalla verifica Didit (documento + liveness + face match). Estendiamo il webhook per leggere la data di nascita dal documento e bloccare gli under-18 alla radice.

In `app/api/kyc/didit/webhook` (e nel codice condiviso `lib/kyc/didit.ts`), quando lo stato è `Approved`:

- Recupera la decisione (`getDiditPortraitUrl` già fa il fetch a `/v3/session/{id}/decision/`; aggiungere `getDiditDob(sessionId)` che estrae la data di nascita dallo stesso array `decision.id_verifications[]`). Il nome esatto del campo (presumibilmente `date_of_birth`, eventualmente con `age`) va confermato su una decisione Didit reale, dato che il webhook non è testabile in locale: si valida con "Try Webhook" della console Didit o con una verifica sandbox vera. Se il campo non c'è, vale il ramo fail-closed sotto.
- **Se la data c'è e l'età è < 18:** non approvare. Imposta `kyc_status = 'rejected'`, non promuovere a seller, non inserire alcun volto in indice, emetti un allarme di sicurezza via `lib/observability.ts`. Lato utente compare lo stato "verifica non riuscita" già esistente in `/account/verify`.
- **Se la data c'è e l'età è >= 18:** procedi all'approvazione e imposta sul profilo `adult_verified_at = now()`, `adult_verified_method = 'document'` (questa persona è verificata anche come adulta, lo strato 1 è soddisfatto a fortiori).
- **Se la data non è leggibile dalla decisione:** fail-closed sull'idoneità adulta. Non concedere lo stato document-adult; segnala una degradazione via `reportDegradation` (decisione Didit senza DOB) e lascia il caso alla revisione manuale. L'identità può anche risultare approvata, ma senza `adult_verified_method = 'document'` il gate di creazione avatar (sotto) non lascia entrare il volto nel registro.

**Mai un volto di minore nel registro.** La creazione avatar e la registrazione veto (`/api/avatar/create`, `/api/veto/register`), che già fanno il confronto volti anti-impersonazione, richiedono in più che l'utente sia adulto verificato da documento.

## Modello dati

Migrazione su `profiles` (minimizzazione GDPR):

```sql
alter table profiles
  add column if not exists date_of_birth date,
  add column if not exists adult_verified_at timestamptz,
  add column if not exists adult_verified_method text;

alter table profiles
  add constraint profiles_adult_method_chk
  check (adult_verified_method is null or adult_verified_method in ('self','document'));
```

- `date_of_birth`: salvata solo per l'autodichiarazione (è dato dell'utente stesso, prova la dichiarazione). La DOB del documento Didit **non** viene salvata: ne calcoliamo solo l'esito (età >= 18), come già facciamo col descrittore volto al posto della foto.
- `adult_verified_at` / `adult_verified_method`: esito + provenienza.

Più l'aggiornamento del trigger `handle_new_user` (vedi `supabase/profile_from_metadata.sql`).

Back-fill: gli account dei 12 founder (avatar pubblici reali, con KYC e consenso firmato su carta) vanno segnati `adult_verified_method = 'document'`, `adult_verified_at = now()`. La lista esatta dei profili va confermata con Morelz prima di eseguire (non back-fillare alla cieca su `kyc_status='approved'`). Gli altri account esistenti restano senza data: li intercetta il prompt una-tantum.

## Logica condivisa (funzioni pure, stile house)

- `lib/age.ts`: `ageFromDob(dob, now): number` e `isAdult(dob, now): boolean`. Gestione anni bisestili, fusi, date impossibili o future. Nessuna dipendenza esterna.
- `lib/adult-gate.ts`: `adultGateReason(profile): 'no_dob' | 'under_18' | null`. Ritorna:
  - `under_18` se `date_of_birth` presente ed età < 18 (difesa, non dovrebbe accadere dopo il blocco);
  - `no_dob` se `date_of_birth` è null e `adult_verified_at` è null (account pre-gate, non ancora confermato);
  - `null` altrimenti (adulto verificato, o data presente e >= 18).

Pattern identico a `lib/avatar-gate.ts` e `lib/consent-gate.ts`: funzione pura, esito loggabile, assenza di dato = blocco.

## Punti di enforcement (a valle)

- **`app/api/generate/route.ts`**: dopo l'auth gate, accanto a `avatarVetoReason`, valutare `adultGateReason(profileChiamante)`. Se `under_18` → 403. Se `no_dob` → 403 con codice dedicato che il client traduce nel prompt una-tantum. Loggare il blocco come gli altri (`logBlockedRequest`).
- **Promozione a seller / creazione avatar** (`/api/avatar/create`, flusso `/signup/avatar/open`, `/api/veto/register`): richiedere `adult_verified_method = 'document'` (volto nel registro solo se adulto provato dal documento).
- **`app/api/account/confirm-age`** (nuovo, autenticato): riceve la data del prompt una-tantum, valida l'età lato server. Se < 18 → blocca, non scrive, allarme. Se >= 18 → scrive `date_of_birth`, `adult_verified_at = now()`, `adult_verified_method = 'self'`.

## UI (mockup approvati)

1. **Signup**: campo data di nascita a tre tendine (GG / Mese / AAAA), obbligatorio, dopo Password e prima del tipo account. Micro-copy in salvia "Devi avere almeno 18 anni per usare SEMBLIC". Tre tendine per robustezza e niente ambiguità di formato. Mobile e desktop verificati.
2. **Blocco under-18**: card centrata, accento coral (stato di prodotto, non errore aggressivo), titolo "SEMBLIC è riservato ai maggiorenni", spiegazione, bottone ghost "Torna alla home".
3. **Prompt una-tantum (utenti esistenti)**: modale fail-closed alla prima azione sensibile. Occhiello "Una verifica veloce", titolo "Prima di continuare", le stesse tre tendine, "Conferma e continua", micro-copy privacy "Serve solo a verificare l'età. Resta privata, non viene mostrata nel tuo profilo".
4. **Strato forte**: nessuna schermata propria, ricade nello stato "verifica non riuscita" già presente in `/account/verify`.

Tutti i copy senza trattini lunghi (regola CLAUDE.md). Palette SEMBLIC: coral = bloccato, salvia = ok/privato, amber = unica azione.

## Errori e fail-closed

- Data assente nel signup non standard o account esistente → `no_dob` → prompt una-tantum, generazione bloccata finché non confermata.
- Decisione Didit senza DOB → niente stato document-adult, revisione manuale, allarme degradazione.
- Data impossibile / futura / età assurda (> 120) → respinta lato server.
- Under-18 al signup → exception nel trigger, account non creato.
- Under-18 al prompt esistenti → nessuna scrittura, blocco, allarme.

## Osservabilità

- `reportDegradation` quando la decisione Didit non espone la data di nascita (non possiamo applicare lo strato forte automaticamente).
- Evento di sicurezza quando un under-18 viene bloccato allo strato forte (documento di minore presentato per diventare avatar).
- I blocchi a valle passano da `logBlockedRequest` come gli altri (forma della richiesta, mai l'identità di chi chiede).

## Privacy e legale

- La data di nascita è dato personale: va citata nella privacy policy (finalità: verifica età; base giuridica: obbligo legale / legittimo interesse).
- Minimizzazione: nessuna DOB documentale salvata, solo l'esito. La DOB autodichiarata resta privata, non mostrata nel profilo pubblico.
- Autodichiarazione: standard accettato in UE per l'accesso; la verità documentale copre il punto critico (volti nel registro).

## Test

- `lib/age.test.ts`: confini (esattamente 18 oggi, giorno prima, nato il 29 febbraio, data futura, molto anziano), `isAdult`.
- `lib/adult-gate.test.ts`: `no_dob`, `under_18`, `null` (data >= 18, `adult_verified_at` valorizzato).
- Estrazione DOB Didit: forme della decisione (radice vs annidata in `decision`, presente / assente, under / over 18).
- Percorso webhook under-18: decisione mock → kyc rifiutato, nessuna promozione, allarme.
- Trigger: insert con metadata under-18 → exception; over-18 → scrive i campi; assente → null. Verifica via `execute_sql` in transazione.

## Non-goal (YAGNI)

- Nessun interstitial a tutta pagina all'ingresso per gli anonimi (scartato: attrito su catalogo e SEO, valore di sicurezza basso).
- Nessuna stima dell'età con terze parti o AI.
- Nessun salvataggio della DOB documentale.
- Nessuna ri-verifica periodica dell'età.

## Decisione aperta per la tua review

- **Enforcement al trigger** (blocco creazione account per under-18 dichiarati) vs **solo gate a valle** (account creabile ma inutilizzabile finché non adulto). Raccomando il trigger: è server-autoritativo al primo istante e dà l'optic "caveau". Se preferisci più semplicità, possiamo tenere solo il gate a valle. Da confermare.
- **Lista founder** da back-fillare: serve l'elenco preciso dei profili, non back-fill alla cieca.
