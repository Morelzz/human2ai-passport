# Hardening di sicurezza SEMBLIC: il "caveau" per i dati biometrici

Spec di design. Data: 2026-06-19. Stato: approvata in brainstorming (Morelz), da rivedere prima del piano operativo (writing-plans).

## 1. Contesto e obiettivo

SEMBLIC (semblic.com, Next.js App Router su Vercel + Supabase Postgres/Storage) custodisce dati biometrici sensibili: volti e avatar di persone reali, documenti KYC, indice dei volti protetti. Morelz richiede sicurezza vera e massima ("blindato come il caveau di una banca"), non di facciata. I volti sono categoria speciale GDPR (art. 9): qui sicurezza tecnica e conformita coincidono.

Obiettivo: portare il prodotto a una postura di sicurezza a strati (defense in depth) su tutti i fronti scelti, con ogni misura verificata a terra.

## 2. Modello di minaccia (tutti e quattro scelti da Morelz)

1. **Fuga di massa**: attaccante esterno, o chiave service-role trapelata, che esfiltra l'intero archivio volti/documenti.
2. **Dati tra utenti**: bug di autorizzazione per cui un account vede i dati di un altro.
3. **Furto d'account**: login compromesso, soprattutto admin/enterprise/seller.
4. **Abuso & breach**: bot/scraping senza rate-limit; oppure breach del provider (dato a riposo).

## 3. Stato attuale verificato a terra (ground truth, 2026-06-19)

Metodo: ho letto lo **stato live** di DB e storage (`get_advisors`, query su `pg_class`/`storage.buckets`), non solo il codice. Lezione interna: i finding di sicurezza dal solo repo sono spesso falsi positivi, vanno confermati a terra.

**Gia solido:**
- RLS attiva su **tutte** le tabelle `public`; la maggior parte con **0 policy** = "nega di default" (stato sano, non un buco). Eccezioni con policy: `profiles` (2), `generation_jobs` (1).
- `storage.objects`: RLS attiva, 0 policy. Bucket **privati**: `documents` (KYC), `face-index` (indice volti protetti), `references` (foto di riferimento). I gioielli biometrici stanno nei bucket privati.
- `CLAUDE.md` fissa gia principi forti: mai biometria on-chain (solo hash), segreti solo server, privacy by default.

**Lacune reali:**
- **Nessun header di sicurezza**: `next.config.ts` ha solo `remotePatterns` per le immagini, nessun middleware. Mancano CSP, `Permissions-Policy` (fotocamera), anti-clickjacking, controllo HSTS, `Referrer-Policy`.
- **La separazione dei dati per-utente vive nel codice, non nel DB** (0 policy per-riga sulle tabelle utente). Un controllo dimenticato in una rotta = esposizione. La **chiave service-role bypassa ogni RLS**: se trapela, l'intero archivio e leggibile.
- **Bucket `generations` pubblico** (output AI): accettabile solo se i path sono ad alta entropia e non vi finisce nulla di privato (da confermare). `lib/storage.ts` crea bucket pubblici di default (`ensureBucket(bucket, true)`): footgun.
- **Protezione password compromesse disattivata** (advisor auth: WARN).
- **Nessun rate-limit** globale/anti-bot, **nessun audit log** degli accessi ai volti, **nessun 2FA**.

## 4. Strategia scelta: Approccio A, a ondate, prima in casa

Defense in depth in tre ondate, restando nello stack attuale (Vercel + Supabase), con un pentest esterno a fine corsa.

Motivazione: il rischio piu grosso (autorizzazione in-app + raggio d'azione della service-role) non lo risolve nessun vendor al posto nostro; le quick win alzano subito il livello a costo quasi zero; il pentest finale trova le cose sottili, non i frutti bassi.

Principio operativo trasversale: tutto verificato a terra; le modifiche al DB vivo (condiviso = prod) a piccoli passi, prima su branch Supabase, poi prod, con verifica per tabella.

## 5. Onda 1: Quick win (giorni, costo ~0)

Per ogni misura: cosa blocca / come (nello stack) / come si verifica.

1. **Header di sicurezza + CSP + Permissions-Policy**
   - Blocca: escalation di XSS (CSP), clickjacking (`frame-ancestors`), MIME sniffing, leak del referrer; disattiva fotocamera/microfono/geo tranne dove serve la scansione del volto.
   - Come: `headers()` in `next.config.ts` (o middleware). CSP parte in Report-Only, poi enforce con nonce sugli script. HSTS sul dominio.
   - Verifica: `curl -I` mostra gli header; la scansione con fotocamera funziona dove abilitata; CSP senza violazioni nel report.

2. **Leaked-password ON + policy password**
   - Blocca: account aperti con password gia trapelate (oggi spento, lo dice l'advisor).
   - Come: toggle dashboard Supabase Auth (HaveIBeenPwned), azione di Morelz; lunghezza minima/robustezza lato form.
   - Verifica: l'advisor WARN sparisce; signup con password compromessa rifiutato.

3. **Igiene segreti + rotazione della chiave service-role**
   - Blocca: il singolo punto di rottura piu grosso. Quella chiave bypassa ogni RLS.
   - Come: verifico che `SERVICE_ROLE` e le API key siano solo server (zero nel bundle client, zero nei log), poi rigenerazione della chiave su Supabase + aggiornamento env su Vercel e worker.
   - Verifica: grep del bundle client per pattern di chiavi = 0; nuova chiave attiva; app e worker funzionano.

4. **Scanner dipendenze (supply-chain)**
   - Blocca: vulnerabilita note nelle librerie.
   - Come: Dependabot su GitHub + `npm audit` in CI; lockfile sotto controllo.
   - Verifica: arrivano le PR di Dependabot; audit pulito o triagiato.

5. **Rate-limit sugli endpoint caldi**
   - Blocca: brute-force sul login, abuso/scraping su upload volto e generazione, enumerazione.
   - Come: regole Vercel Firewall sui path sensibili e/o limiter applicativo (token bucket su Postgres o Upstash free) su `login`, `signup`, upload KYC/volto, `generate`, `enhance-prompt`.
   - Verifica: martellando un endpoint scatta `429` oltre soglia.

6. **Monitoraggio errori (con PII scrubbing)**
   - Blocca: la cecita. Senza occhi non vedi un attacco in corso.
   - Come: Sentry (free) o monitoring di Vercel, configurato per non loggare mai volti/token/email.
   - Verifica: un errore di test compare, ripulito dai dati sensibili.

**Bonus a costo zero:** chiudo il footgun di `lib/storage.ts` (niente bucket pubblici di default), e confermo che i path del bucket pubblico `generations` siano impossibili da indovinare e privi di dati privati.

## 6. Onda 2: Architettura (settimane)

Il cuore: qui un bug nel codice o una chiave rubata smettono di essere catastrofici. Si fa a piccoli passi, prima su branch DB Supabase, poi in prod, con verifica per tabella.

1. **Policy RLS per-riga (la rete di sicurezza)**
   - Blocca: "dati tra utenti" e contiene il raggio di un bug. Oggi la separazione e solo nel codice; con le policy, anche se una rotta dimentica il filtro, il DB nega.
   - Come: su ogni tabella con dati per-utente (`avatars`, `generations`, `consent_events`, `payouts`, `volt_transactions`, `match_searches`, `scan_bookings`, `organizations`...) policy legate a `auth.uid()` (proprietario) o al ruolo. Dove la rotta legge dati dell'utente loggato, si passa dal client autenticato (cosi le policy scattano) e si tiene il service-role solo per operazioni di sistema (worker, webhook, admin).
   - Verifica: con l'utente A leggo una riga di B, deve dare 0 righe; col proprietario, ok. Test automatici sulle tabelle critiche.

2. **Audit di autorizzazione su ogni rotta**
   - Blocca: la classe di bug "rotta che dimentica il controllo proprietario" (IDOR).
   - Come: censimento di tutte le `app/api/**` e server action che toccano dati per-utente; ognuna deve verificare sessione + proprieta; le rotte service-role devono avere un motivo esplicito e documentato.
   - Verifica: per ogni rotta sensibile, test "A non accede alla risorsa di B" che risponde 403/404.

3. **Audit log degli accessi ai volti**
   - Blocca: la cecita forense (e accountability GDPR).
   - Come: tabella `access_log` append-only (chi, cosa, quando, IP/UA), scritta quando si genera un signed URL o si scarica da `documents`/`face-index`/`references`. Solo metadati, mai il volto. Lettura ristretta.
   - Verifica: scaricare un KYC scrive una riga; l'utente non puo alterare/cancellare il log.

4. **2FA / MFA**
   - Blocca: furto d'account anche con password rubata.
   - Come: MFA TOTP di Supabase Auth. Obbligatorio per admin/enterprise, incoraggiato per i seller.
   - Verifica: login admin chiede il secondo fattore; recupero gestito.

5. **Hardening dei link allo storage**
   - Blocca: link ai volti che durano troppo o trapelano.
   - Come: per i bucket privati, signed URL a scadenza breve generati on-demand dopo il check di proprieta, mai path diretti. Per `generations`: decidere se privato con signed URL o pubblico con path ad alta entropia e zero dati privati.
   - Verifica: un signed URL scade; un non-proprietario non lo ottiene.

## 7. Onda 3: Processo e garanzia

1. **Backup + test di restore (DR)**
   - Blocca: perdita dati, ransomware, errore catastrofico. Un backup mai testato non e un backup.
   - Come: confermo i backup automatici Supabase (point-in-time recovery se il piano lo prevede) + una prova di restore documentata su progetto/branch separato; export off-site cifrato dei dati critici.
   - Verifica: restore di prova riuscito; RTO/RPO noti.

2. **Retention + cancellazione GDPR (diritto all'oblio)**
   - Blocca: tenere i volti piu del dovuto e rischio e illecito. Si aggancia a "consenso e una timeline" e alla revoca prospettica.
   - Come: regole di conservazione (KYC/reference/face-index dopo revoca o chiusura account) + flusso di cancellazione che rimuove davvero da tabelle + tutti i bucket + indice volti, lasciando solo l'hash anonimo.
   - Verifica: cancellare un account svuota volto/documenti da ogni bucket e tabella; resta solo l'hash; provato a terra.

3. **Piano di risposta agli incidenti**
   - Blocca: il panico. Breach di dati biometrici: GDPR impone notifica entro 72 ore.
   - Come: runbook breve (chi fa cosa, come revocare la service-role, come forzare logout globale, come notificare Garante e interessati), contatti, log da consultare (l'`access_log` dell'Onda 2).
   - Verifica: simulazione a tavolino del runbook.

4. **DPIA (valutazione d'impatto)**
   - Blocca: il rischio legale. Per trattamento biometrico su larga scala la DPIA e di fatto obbligatoria (art. 35 GDPR).
   - Come: documento che mappa dati, finalita, rischi e misure; gran parte la produce questo stesso hardening.
   - Verifica: DPIA redatta e archiviata, misure tracciate.

5. **Pentest di terza parte**
   - Blocca: i punti ciechi. Chiuso il chiudibile in casa, un esterno prova a entrare.
   - Come: pentest mirato (web app + auth + storage) con Onda 1 e 2 in piedi; eventuale bug bounty leggero dopo.
   - Verifica: report con findings triagiati e richiusi.

## 8. GDPR biometrico (trasversale)

I volti sono categoria speciale (art. 9). Implicazioni gia integrate: DPIA (art. 35, Onda 3), notifica breach entro 72h (incident response, Onda 3), diritto all'oblio con cancellazione reale + hash anonimo e retention (Onda 3), accountability via audit log (Onda 2). Coerente coi guardrail di `CLAUDE.md`.

## 9. Sequenza e rischi

- Onda 1 prima: basso rischio, alto valore, costo ~0.
- Onda 2 #1 (RLS) e la piu delicata: branch DB + verifica per tabella, perche policy errate possono bloccare l'app sul DB vivo condiviso. #2/#3/#5 incrementali e a basso rischio. #4 (2FA) dipende dalla gestione ruoli attuale.
- Onda 3 quando Onda 1 e 2 sono in piedi.
- Push e deploy solo su "pubblica" (regola di Morelz); migrazioni applicate da Claude con SQL mostrato prima e verifica dopo.

## 10. Fuori scope e assunzioni

- Non si cambia stack: resta Vercel + Supabase.
- Servizi a pagamento (Cloudflare/Sentry/Snyk) opzionali, valutati misura per misura, non assunti come obbligo.
- Si assume DB condiviso = prod vivo con dati reali: massima cautela nelle migrazioni.
- Da confermare in implementazione: entropia dei path del bucket `generations`, sito di upload del bucket `documents`, assenza di un middleware in `src/`.

## 11. Definizione di "fatto"

Ogni misura ha la sua verifica a terra (sopra). A regime: l'advisor di sicurezza Supabase senza WARN; header di sicurezza presenti e CSP in enforce senza violazioni; test "A non vede B" verdi sulle tabelle critiche; signed URL a scadenza; restore di prova riuscito; DPIA archiviata; findings del pentest richiusi.
