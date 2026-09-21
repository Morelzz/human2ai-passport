# Ward · Protected Avatars, Module 1 — PROPOSTA DI DESIGN

> STATO: **APPROVATA da Morelz il 2026-06-19** ("ok" su D1-D9 + piano a fette). Prossimo
> passo: piano di implementazione della Slice 1 (writing-plans). I punti 💸 (D3 Google Vision
> key, D4 Didit, D8 Stripe) servono solo per l'ESECUZIONE live, non per COSTRUIRE la Slice 1:
> la discovery si sviluppa dietro l'interfaccia con un provider stub + l'implementazione
> Google Vision, e si attiva quando arriva la chiave. Doc tenuto untracked come le altre spec.
> Fonti lette: i 2 doc del brief in Downloads + 6 mockup; CLAUDE.md; DB live
> (tabelle + estensioni); `app/api/verify-face/route.ts`, `lib/face-index.ts`,
> `lib/protected-index.ts`, `lib/face-similarity.ts`, `lib/face-match.ts`,
> `lib/identikit-vision.ts`, `app/proteggi/ProteggiClient.tsx`, `app/scansione/page.tsx`,
> `lib/ui.ts`, `app/globals.css`.

## 0. Frase guida

Ward e' lo scudo che l'utente abita; Nemesis e' il colpo che evoca. Un avatar
protetto e' gratis e impedisce al mondo di generarti dentro Semblic; Ward cerca le
copie che gia' esistono fuori. Una persona verificata, un'impronta del volto, un
registro che blocca la generazione E alimenta la caccia.

Ward e' il **mantenimento di una promessa gia' scritta nel sito**: la pagina
`/proteggi` dice gia' "Fuori da Semblic offriamo allerta precoce e rimozione
assistita". Module 1 la rende vera.

---

## 1. La scoperta che cambia il piano: gran parte esiste gia'

Il brief e' scritto come greenfield, ma a terra **mezzo Module 1 e' gia' costruito**.
Riusiamo, non riscriviamo.

| Pezzo del brief | A terra | Mossa |
|---|---|---|
| Enrollment avatar protetto + faceprint + consenso Art.9 (A6.3) | `/proteggi` -> `/api/veto/register`, descrittori on-device, `protected-index.json` | **RIUSO + estendo** (manca solo lo scope monitoraggio) |
| Registro che blocca la generazione (Job A) | `protection_only`, `lib/avatar-gate.ts` (VETO), `verify-face`, `protection_alerts` | **GIA' VIVO**, non si tocca |
| Motore "embed + match" (A1) | `@vladmandic/face-api` FaceNet 128-d, distanza euclidea, soglia 0.6, indice JSON in bucket privato | **RIUSO server-side** (vedi D1) |
| KYC (A3) | `kyc_status` + flusso manuale + seam gia' previsto per provider certificato | **Innesto Didit** sul seam esistente |
| Job in background | worker ECHO su Railway (`worker/poll.mjs` polla `generation_jobs`) | **RIUSO il pattern** per lo scan |
| Token design (Part B) | `app/globals.css` + `lib/ui.ts`: Obsidian/Lumen/Amber + coral/salvia | **RIUSO**; i mockup ci mappano 1:1 + 5 token nuovi |

**Net-new vero (cuore di Module 1):** lo strato di **caccia** = consenso-monitoraggio,
discovery web, orchestrazione scan, evidence capture, la UI Ward (4 tab) e Nemesis
(documenti DMCA/GDPR). E' il braccio proattivo che non esiste ancora.

---

## 2. Decisioni (con la mia raccomandazione + l'alternativa)

> Le decisioni che costano soldi/atti esterni sono marcate **[serve tuo via libera]**.

### D1 — Il motore di matching (Sezione A1) — RIVISTA rispetto a ieri
**Raccomando: riusare lo STESSO motore `@vladmandic/face-api` (FaceNet 128-d), eseguito
server-side dentro il worker (Node/Railway) per il web hunt.**
- Perche': face-api gira anche in Node. Riuso i **descrittori gia' registrati** (nessun
  re-embedding), la stessa soglia/curva (`lib/face-similarity`), lo stesso indice. "Un
  solo motore" diventa LETTERALE (browser + server stesso engine). Zero Python, zero
  pgvector, zero migrazione del path biometrico appena blindato.
- Costo onesto: 128-d FaceNet e' meno robusto del 512-d ArcFace su immagini web difficili
  (angoli, compressione, volti parziali). Lo gestiamo con soglia conservativa + lo stato
  "needs review" + il feedback "Questo non sono io". L'upgrade a ArcFace 512-d resta un
  v2 pulito dietro la stessa interfaccia `match()` (vedi Slice 3).
- Dipendenze: `@vladmandic/face-api` e' GIA' installata (^1.7.15, verificato). Net-new da
  aggiungere al worker: un backend Node per tfjs (`@tensorflow/tfjs-node`) + `canvas`
  (polyfill), e `playwright` per l'evidence (oggi NON installato). Worker Railway gia' c'e'
  (`worker/start-prod.mjs` lancia il poller `worker/poll.mjs`): lo scan si aggiunge a quel
  pattern. Stack verificato: Next 16.2.7, React 19.2.4, npm.
- **Alternativa (brief purista):** servizio Python FastAPI + InsightFace `buffalo_l`
  512-d ora. Piu' accurato, ma nuovo runtime da ospitare + re-embedding di tutti +
  pgvector per Job A. Lo tengo come Slice 3 / upgrade, non come blocco di partenza.

### D2 — Dove gira lo scan (embedding, match, evidence)
**Raccomando: nel worker su Railway, riusando il pattern ECHO.** Lo scan e' un job
asincrono (discovery -> embed -> match -> evidence) come la generazione. Niente su Vercel
serverless (tfjs-node + Playwright non ci stanno bene). Tabella `scan_jobs`, il worker
polla e processa.

### D3 — Discovery provider (Job B esterno) **[serve tuo via libera]**
**Raccomando: partire con UN provider, Google Vision `WEB_DETECTION`, dietro l'interfaccia
`DiscoveryProvider`; TinEye come secondo, dopo.**
- Net-new: serve un account Google Cloud + chiave. Costo ordine ~$1.5 / 1000 immagini
  dopo il free tier. NB: oggi `identikit-vision.ts` usa Claude vision, NON Google: questa
  e' integrazione nuova.
- Regola del brief rispettata: la discovery usa **similarita' di contenuto**, NON manda i
  volti a un motore biometrico di ricerca facce (niente Clearview/PimEyes).

### D4 — KYC (A3) **[serve tuo via libera]**
**Raccomando: adottare Didit sul seam esistente `kyc_status` (free 500/mese), tenendo il
KYC manuale attuale come fallback.** Il codice gia' dice "quando servira' il livello
certificato si innesta sopra `kyc_status` senza buttare nulla": Didit ci entra pulito.
- Serve account Didit + verifica GDPR/EU del provider (il brief chiede conferma legale
  prima del go-live). Memorizziamo solo `verified=true` + ref + timestamp, mai i biometrici
  del documento.
- **Per la Slice 1 si puo' anche partire col KYC esistente** e innestare Didit nella Slice 2,
  per non bloccare la caccia sull'integrazione del provider.

### D5 — pgvector / `reference_embedding vector(512)`
**Raccomando: NON in Module 1.** Il web hunt e' un match **1:1** contro UNA persona
monitorata: basta confrontare i descrittori della persona, non serve un vector DB.
pgvector serve solo a Job A su scala (cercare un volto fra TUTTI i protetti) e lo aggiungiamo
quando passiamo a ArcFace (Slice 3). L'indice resta il JSON nel bucket privato, come oggi.

### D6 — Split persona/avatar (`protected_persons`)
**Raccomando: NON creare `protected_persons`.** Nel codice avatar == persona gia' (1 owner,
1 volto), il KYC vive in `profiles.kyc_status`. Aggiungere una tabella persona separata
imporrebbe una migrazione + refactor grosso contro tutto l'esistente. Riuso `avatars` +
`profiles`, ci attacco intorno le tabelle Ward. (`avatars.type open|protected` del brief =
gia' il booleano `protection_only`.)

### D7 — Ward rispetto a `/proteggi` e `/scansione`
- `/scansione` = prenotazione scansione **fisica** (studio/partner). Nessuna relazione, nessun
  conflitto di nome.
- `/proteggi` = **ingresso** dell'avatar protetto (enrollment + Art.9). Resta la porta.
- **Ward = l'app loggata di protezione** che vive dopo l'enrollment: la raggiungi da
  `/proteggi` (stato "attivo") e da `/account`. Route nuova proposta: **`/ward`** (mobile-first,
  4 tab). Nessuna pagina esistente viene buttata.

### D8 — Modello di business (A5) **[serve tuo via libera, conferma o ribalta]**
Assunzione del brief: registrazione protetta gratis; **Ward hunting a pagamento** via Stripe
Connect (pass-through, cosi solo la commissione Semblic e' ricavo forfettario).
**Raccomando per Module 1: spedire la caccia SENZA paywall** (gratis/manuale in MVP) e
aggiungere il billing Stripe Connect in una Slice successiva, per non incastrare il valore
dietro l'integrazione pagamenti. Stripe c'e' gia' (`lib/stripe.ts`); Connect e' setup nuovo.

### D9 — Font e token
- **Colori:** riuso i token del repo (`globals.css` + `lib/ui.ts`) + aggiungo i **5 token Ward
  net-new**: `--strike` (#FF5247, Nemesis piena intensita'), `--indigo` (#7B6CF6) e
  `--depth-cyan` (#46C6D6) + `--grad-depth` (radar/identita') + `--grad-strike` (coral->rosso
  scuro). Mappa mockup->repo: amber/salvia/coral gia' coincidono; `--grad-signal` = il
  `--grad-tramonto` esistente.
- **Font:** il repo usa Geist Sans/Mono; i mockup vogliono Space Grotesk + JetBrains Mono +
  Inter ("strumento di monitoraggio"). **Raccomando: dare a Ward la sua firma tipografica**
  (JetBrains Mono per ogni dato/score/hash/URL/timestamp, Space Grotesk per i titoli),
  caricati SOLO sulle route Ward, lasciando Geist al resto di Semblic. E' la mossa che fa
  leggere Ward come uno strumento, non marketing. (Piccola, reversibile: se preferisci
  coerenza totale, restiamo su Geist.)

---

## 3. Architettura

### 3.1 Dati (Supabase / Postgres), riuso + net-new
**Riuso (nessuna modifica):** `avatars` (con `protection_only`, `owner_id`, `revoked_at`),
`profiles.kyc_status`, `consent_events` (timeline), `protection_alerts`, bucket privato
`face-index` (`index.json` + `protected-index.json`).

**Net-new (tabelle Ward, tutte con RLS owner-scoped, additive):**
- `monitoring_consents` (avatar_id, scope, on_match ['notify'|'auto'], open_web boolean,
  consent_doc_path, granted_at, expires_at, revoked_at). E' il consenso di MONITORAGGIO,
  distinto dall'Art.9 di non-generazione gia' raccolto in `/proteggi`.
- `scan_jobs` (avatar_id, status [queued|running|done|error], provider, started_at,
  finished_at, stats jsonb, error).
- `scan_candidates` (TRANSITORIA: scan_job_id, source_url, phash, status; **cancellata dopo
  il processing**, data-minimization regola A2.3).
- `scan_matches` (avatar_id, scan_job_id, source_url, host, score, band [confirmed|review],
  ai_verdict, sensitivity [standard|sensitive|minor], phash, content_anchor, created_at).
  Solo confirmed/review; i sotto-soglia non si salvano.
- `evidence_records` (scan_match_id, screenshot_path, html_path, whois jsonb, hash,
  anchored_at). Bucket privato `ward-evidence`.
- `allowlist` (avatar_id, source/host, reason, created_at): fonti autorizzate per-avatar.
- `audit_log` (actor, action, target, meta jsonb, created_at): append-only, ogni scan,
  cambio consenso, decisione di match, azione Nemesis.
- `nemesis_actions` (scan_match_id, kind [dmca|gdpr17], artifact_path, status
  [drafted|sent|host_pending|removed|legal|escalated], created_at, updated_at).

### 3.2 Il primitivo di matching (servizio condiviso interno)
NON un microservizio separato in Module 1: una **funzione condivisa** nel worker.
- `embed(image) -> descriptor|null` (face-api server-side; rifiuta 0 o >1 volto su una
  reference; per i candidati prende il volto piu' grande, come gia' fa il client).
- `match(referenceDescriptors[], candidateImage) -> { score, band, faceCount }` (distanza
  euclidea -> `similarityFromDistance`; soglie da env, default coerenti col brief: score
  alto = confirmed, medio = review, basso = scartato).
- **Mai** ritorna o salva il descrittore del candidato (A2.2/A2.3).
- Stessa interfaccia che domani implementera' ArcFace 512-d (Slice 3) senza toccare i chiamanti.

### 3.3 La pipeline di scan (Job B), gated
1. `assertMonitoringConsent(avatarId)` PRIMA di tutto: consenso attivo, non scaduto, non
   revocato, scope giusto. Fail -> 403 + `audit_log`. Nessun bypass flag.
2. `DiscoveryProvider.find(reference)` (Google Vision web detection) -> URL candidati.
   Contenuto-similarita', non biometria.
3. Per candidato: `embed` + `match`. Sotto soglia -> **cancella il candidato, non salva
   niente** (solo URL + phash sui match, A2.3).
4. Match confirmed/review -> classificazione sensibilita' (standard/sensitive/minor, stub
   classificatore in Module 1 con regole prudenti) -> `scan_matches`.
5. Evidence capture (Playwright nel worker): screenshot, HTML snapshot, WHOIS, phash ->
   `evidence_records` (+ campo `content_anchor` lasciato per l'ancoraggio blockchain futuro).
6. Tutto loggato in `audit_log`.

### 3.4 Le regole non-negoziabili (A2), applicate in CODICE
- **Consent gate** server-side prima di ogni discovery/match (3.3.1).
- **Solo biometrici consenzienti**: mai persistere descrittori/crop di terzi dal web.
- **Data-minimization**: `scan_candidates` cancellata dopo il processing; sui non-match
  zero ritenzione; sui match solo URL + phash.
- **1:1 only**: nessun endpoint "chi e' questo sconosciuto"; il match e' contro la persona
  monitorata.
- **Child-safety (priorita' massima)**: match flaggato come possibile minore -> mai mostrato,
  mai salvato nel vault dell'utente, non azionabile dal flusso normale; si conserva il minimo
  per la segnalazione e si instrada all'autorita' (NCMEC/hotline); UI con avviso bloccato +
  report reference, nessun controllo di reveal.
- **Contenuto sensibile**: sfocato di default dietro avviso supportivo ("non sei obbligato a
  guardare; Nemesis puo' agire senza che tu veda"); reveal a scelta; NCII -> fast-track
  StopNCII oltre al takedown; tono di sostegno; protezione non disattivabile.
- **Audit-log** append-only ovunque.

### 3.5 UI Ward (Part B)
- Route `/ward`, **mobile-first**, bottom-nav 4 tab: **Radar / Detections / Nemesis / Vault**
  (fedele a `sentinel-mobile-v2.html`, rinominato Ward).
- Token reali del repo + i 5 token Ward nuovi (D9). Radar con sweep salvia, blip per
  severita', core identita' (gradiente depth). Selection bar in Detections (non e' una pagina).
  Chip identita'+consenso nella top bar. Nemesis: dramma per l'atto (overlay strike), calma
  per il registro (tab operativa).
- **Dettaglio detection, 3 comportamenti** (da `sentinel-detail.html`, apertura automatica in
  prod): standard / sensibile-sfocato+StopNCII / minore-locked+NCMEC. Stesso scheletro, tre
  comportamenti.
- **Metodo (struttura prima, bellezza alla fine):** prima le 4 tab funzionano su dati reali con
  styling minimo, poi la passata visiva completa (radar animato, overlay Nemesis, micro-interazioni,
  reduced-motion, focus visibile). Coerente con il tuo workflow "design alla fine".

---

## 4. Decomposizione in fette verticali

Module 1 e' ~8 sottosistemi: lo spediamo a fette, ognuna verificabile a terra.

**Slice 1 — "Trova le copie" (il cuore difendibile).** Riusa enrollment/consenso/motore.
1. `monitoring_consents` + `assertMonitoringConsent` + `audit_log` (+ test del gate PRIMA di
   abilitare qualsiasi scan: build order del brief, A8.2).
2. Primitivo `embed`/`match` server-side (face-api nel worker).
3. UN DiscoveryProvider (Google Vision) dietro l'interfaccia.
4. `scan_jobs`/`scan_candidates`/`scan_matches` + i delete di data-minimization.
5. Evidence capture (screenshot/HTML/WHOIS/phash) nel worker.
6. UI Ward minima: Radar + Detections list + Detection detail coi 3 comportamenti, su dati
   reali, token veri.
7. Nemesis livello Module 1: seleziona -> arma -> conferma (finestra cancel) -> **genera i
   documenti DMCA + GDPR Art.17** con evidenza allegata -> tab operativa. (Nessuna API di
   takedown automatica.)
> Slice 1 = la verticale del brief, sfrondata: un solo provider discovery, KYC esistente,
> niente Didit/pgvector/Python/billing. Spedibile e dimostrabile.

**Slice 2 — Fiducia e scala minima:** Didit sul `kyc_status`; secondo DiscoveryProvider
(TinEye); rifinitura `monitoring_consents` nello schermo consenso (scope, durata, on-match);
passata visiva Ward completa (radar animato, overlay Nemesis).

**Slice 3 — Upgrade motore + billing:** ArcFace 512-d server (dietro la stessa `match()`),
pgvector per Job A su scala, Stripe Connect per il hunting a pagamento.

**Esplicitamente dopo (A9):** push notifications, anti-recharge loop, registry-as-API,
takedown API automatica (Bolster/DMCA.com), deepfake detection reale, ancoraggio blockchain,
viste multi-avatar/agenzia.

---

## 5. Test (build order del brief, A8)
- **Prima** il consent gate con i suoi test (nessun path di scan finche' non passano).
- Test del primitivo match su coppie note (stessa persona / persone diverse / volto assente).
- Test dei delete di data-minimization (il candidato sotto soglia non lascia traccia).
- Test dei 3 comportamenti di sicurezza (standard / sensibile / minore) sullo stesso scheletro.
- Verifica a terra (il mandato): nessun finding solo-da-repo; RLS con `get_advisors`/SQL,
  429/limiti dal vivo, niente biometrici di terzi persistiti.

---

## 6. Cosa serve da te (i "via libera")
1. **D1**: ok al motore face-api 128-d server-side ora (vs Python ArcFace subito)?
2. **D3 [costo]**: ok ad aprire Google Cloud Vision (chiave + piccolo costo per immagine)?
3. **D4 [account]**: adottiamo Didit (Slice 2) o teniamo il KYC manuale per ora?
4. **D8 [business]**: Module 1 senza paywall (gratis in MVP) e billing dopo, confermi?
5. **D9**: Ward con la sua firma tipografica (Space Grotesk + JetBrains Mono) o coerenza Geist?
6. **Legale**: il brief chiede DPIA + conferma GDPR del provider KYC e dei testi consenso prima
   del go-live; i testi `/proteggi` sono gia' "in revisione legale". Lo teniamo come gate pre-lancio.

---

## 7. Da confermare / aperto
- Soglie esatte score (confirmed/review) per 128-d sulle immagini web: si tarano a terra su un
  set di prova.
- Classificatore sensibilita'/minore in Module 1: stub a regole prudenti (host noti, segnali
  testuali) finche' non arriva un classificatore vero (A9).
- Quota worker Railway per face-api + Playwright (carico e tempi di uno scan).

---

### Prossimo passo
Tu rivedi questa proposta (anche solo le decisioni D1..D9 in sezione 2), dici "ok" o cambi
quel che vuoi. Poi: finalizzo la spec, la committo, e passo a `writing-plans` per il piano di
implementazione della Slice 1. Nessun codice prima del tuo OK.
