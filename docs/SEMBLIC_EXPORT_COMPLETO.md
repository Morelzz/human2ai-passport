# SEMBLIC — Export completo del sito (stato a 2026-06-23)

> **A chi legge (Claude):** questo è il dump completo e autosufficiente del prodotto Semblic così com'è OGGI, generato dal codice reale, dal database di produzione e dall'inventario dei file. Serve a te per costruire una **nuova roadmap definitiva**. Non hai accesso al repo: tutto ciò che ti serve è qui dentro.
>
> Per ogni funzione trovi lo stato reale marcato così:
> - **LIVE** = funziona davvero in produzione su semblic.com
> - **STUB** = c'è il guscio/UI ma il backend è finto o NO-OP
> - **GATED** = esiste ma è disattivato dietro flag, env mancante o decisione
> - **STALE** = concetto vecchio rimasto nel codice, non più coerente con la direzione
>
> Convenzione di scrittura del fondatore (Morelz): **niente trattini lunghi**, italiano, premium e onesto.

---

## 0. In una frase

Semblic è il **registro fidato delle identità AI consenzienti**: una persona reale rivendica il proprio volto, dichiara come può essere usato, viene pagata quando viene usato, e chiunque può verificarlo. Attorno al registro ci sono un **generatore** identity locked, un **editor** di post-produzione, e **Ward**, il modulo anti-deepfake che protegge i volti sul web aperto.

Payoff: **Real Humans. Real Rights. Real Earnings.**

---

## 1. Visione e posizionamento (dal CLAUDE.md di progetto)

- Semblic è il **filtro obbligatorio di tutela umana** che sta PRIMA di ogni generazione di un essere umano. Tesi: in futuro generare un umano senza diritto d'immagine sarà impossibile; chi genera deve passare da un catalogo di persone reali consenzienti, che vengono pagate.
- NON è un generatore di immagini in sé: i motori (Higgsfield, OpenAI, in futuro HeyGen/ElevenLabs) sono terze parti invisibili. Semblic è la **tutela dell'umano + i binari di diritti e pagamenti**.
- Modulo costruito per primo: il **Registro Volti / Avatar Passport** ("la SIAE dei volti"). Prima il registro dei diritti, poi generazione/royalty/enforcement.

### Guardrail NON negoziabili
1. **Mai dati biometrici o personali on-chain** (vincolo GDPR; on-chain solo hash anonimi).
2. **Il consenso è una timeline, non uno stato fisso**: "autorizzato dal–al", con eventuale "revocato dal X". La revoca è **prospettica** (blocca il futuro, non cancella il passato).
3. **Privacy by default**: nessuna vendita di dati, sensibili solo lato server.
4. **Onestà sui livelli**: SPARK/SHAPE = "ispirato a"; SOUL/HUMAN = identity-locked.
5. **Segreti solo in `.env.local`**, mai nel client, mai committati.

---

## 2. Brand e identità visiva (SEMBLIC)

- Rebrand da "Human2AI" a **SEMBLIC** il 2026-06-17. Dominio di produzione: **semblic.com**.
- Estetica: minimale, premium, dark-first, avanguardia, futuristica. Zero aspetto "giocattolo".
- Titoli display ultra-sottili (peso 200, tracking -0.04em), geometria a **pillola** (raggio pieno sui bottoni), bordi hairline, vuoto che respira.
- **Un solo colore d'azione: Amber.** Gli stati sono coral (bloccato) e salvia (verificato): significato di prodotto, non decorazione.
- Palette:
  - Identità: **Obsidian `#0C0F17`** (sfondo) · **Lumen `#F2E9D8`** (testo/logo) · **Amber `#F2A93B`** (azione, hover `#E29A2E`).
  - Superfici: `#141A24` (card) · `#1E2530` (input/modali) · `#2C3440` (linee).
  - Stati: **coral `#EE7A70`** (bloccato/no-match) · **salvia `#7FAE96`** (verificato/consenso).
  - Gradienti (solo sfondi/sezioni, MAI bottoni): tramonto (amber→coral), aurora (amber→obsidian), fiducia (salvia→teal).
- Nota tecnica: i token CSS storici (`--color-violet`, `text-crimson`, `text-teal`, `bg-obsidian-2/3`) sono ALIAS coi nuovi valori. Sorgenti: `app/globals.css`, `lib/ui.ts`.
- Famiglia prodotti: **Ward** (protezione/monitoraggio), **Nemesis** (lo strike legale), **Sigil** (il verificatore).

---

## 3. Stack tecnico e dipendenze

- **Framework:** Next.js **16.2.7** (App Router, Turbopack) + React **19.2.4** + TypeScript 5.
- **Styling:** Tailwind CSS v4.
- **Backend/DB:** Supabase (Postgres 17 + Auth), progetto `H2AI` ref `ktjebfavzherochwhtis` (eu-west-1). DB **condiviso = local + PROD**.
- **Deploy:** Vercel (team H2AI, progetto `human2ai-passport`), dominio `semblic.com` (apex live HTTPS).
- **Generazione immagini:** OpenAI gpt-image-2 (chiamato "ECHO" nel codice) come motore attivo; `@higgsfield/client` presente ma dormiente.
- **Volti / biometria on-device:** `@vladmandic/face-api` + `@tensorflow/tfjs` + `tfjs-backend-wasm` (FaceNet 128-d).
- **KYC:** Didit (integrazione reale, env mancanti → fallback stub).
- **Discovery web (Ward):** Google Cloud Vision (WEB_DETECTION), condizionata alla chiave.
- **Altre librerie:** `@anthropic-ai/sdk`, `@sentry/nextjs`, `framer-motion`, `gsap`, `three`, `leaflet`, `lenis`, `next-view-transitions`, `lucide-react`, `marked`/`gray-matter` (blog file-based), `qrcode`, `viem` (on-chain Base), `playwright` (e2e), `sharp` (editing server), `vitest` (test).
- Hashing token: SHA-256 (Web Crypto / Node crypto), nessuna libreria pesante.

### Numeri della base di codice
- ~30.300 righe TS/TSX, 329 file TS/TSX.
- **48 pagine** (`page.tsx`), **55 endpoint API** (`route.ts`), **103 moduli `lib/`**, **42 componenti**, 19 file di test (vitest + Playwright e2e).
- 41 file SQL in `supabase/`, **30 tabelle** in produzione.
- 335 commit (5–23 giugno 2026). Branch live: `master` = `ward-module1` = `f1ec65b`.

---

## 4. Sitemap completa (48 pagine pubbliche/app)

### Pubblico / marketing
- `/` — homepage (hero con contatori reali, 8 avatar in vetrina, sezioni Ward/strumenti).
- `/catalogo` — registro pubblico degli avatar verificati.
- `/passport/[handle]` — **il passaporto del volto** (hero cinematic, identity kit, atto di proprietà, timeline consenso, repertorio, royalty).
- `/verify` — **Sigil**, verificatore pubblico (filigrana o face-search).
- `/badge` — generatore di badge embeddabile.
- `/receipt/[cert]` — ricevuta di conformità stampabile.
- `/consent/[token]` — conferma del consenso da parte della persona (link tokenizzato).
- `/tutela` — landing tutela identità (Didit + faceprint + privacy).
- `/proteggi` — alias storico, redirect a `/signup/avatar/protected`.
- `/scansione`, `/scansione/prenota` — sedi di scansione + prenotazione.
- `/prezzi`, `/faq`, `/contatti`, `/partner`, `/sviluppatori`, `/enterprise`, `/enterprise/register` — info, B2B, partner.
- `/academy` — corsi (struttura DB presente).
- `/blog`, `/blog/[slug]` — blog file-based (`content/blog/*.md`).
- `/trasparenza`, `/privacy`, `/termini`, `/cookie` — legali.
- `/report` — segnala abuso.

### Generazione / studio
- `/match` — scelta avatar + brief + studio fotografico + generazione.
- `/studio`, `/studio/edit`, `/studio/edit/[cert]` — editor di post-produzione.

### Ward (protezione)
- `/ward` — entry entitlement-aware (locked / demo / full).
- `/ward/demo` — demo pubblica 100% client-side.

### Account / onboarding
- `/login`, `/signup`.
- `/signup/avatar` — fork creazione avatar (KYC poi: aperto | protetto).
- `/signup/avatar/open` — ponte verso il flusso avatar canonico `/account/avatar`.
- `/signup/avatar/protected` — flusso protetto (KYC → foto volto → consenso Ward).
- `/account` — hub personale.
- `/account/avatar`, `/account/consent`, `/account/volt`, `/account/attivita`, `/account/reports`, `/account/verify`, `/account/kyc`, `/account/review`, `/account/face-index`, `/account/kyb-review` — gestione + code admin.

---

## 5. Mappa delle API (55 endpoint, raggruppati)

> Tutti gli endpoint sotto **esistono** nel codice (verificato da `git ls-files`). Dove il comportamento è certo è descritto; dove no è marcato "(da confermare)".

### Registro / verifica / consenso
- `GET /api/verify` — valida un token (avatar o generazione), esito breve. **LIVE**
- `POST /api/verify-image` — estrae la filigrana invisibile (3 path: PNG server con sharp, PNG grandi client, JSON certificato), ritorna generazione + timeline. **LIVE**
- `POST /api/verify-face` — face-search sul registro pubblico (descrittore on-device, zero retention) + filtri metadati. **LIVE**
- `GET /api/badge/[handle]` — SVG badge dinamico (verde attivo / coral revocato), cache 5 min. **LIVE**
- `GET /api/sample/[handle]/[index]` — immagine della galleria watermarkata. **LIVE**
- `POST /api/avatar/consent` — revoca / riattiva / set consenso commerciale sì-no. **LIVE**
- `GET/POST /api/consent/[token]` — conferma persona-nel-loop via link. **LIVE** (usata da B2B; signup web non ancora wired)
- `GET /api/receipt/[cert]` — ricevuta di conformità JSON. **LIVE**
- `GET /api/content/[cert]` — contenuto per certificato (capability token). (da confermare)
- `POST /api/contents/seen` — marca contenuti visti. (da confermare)
- `POST /api/report` — invio segnalazione abuso. **LIVE**

### Generazione / editor / motori
- `POST /api/match` — matching avatar da brief/identikit (esclude revocati e protection_only). **LIVE**
- `POST /api/generate` — generazione: preview sincrona + commerciale asincrona (enqueue + blocco VOLT). **LIVE** (motore = ECHO/OpenAI; ramo Higgsfield presente ma `useEcho=true` hardcoded)
- `GET /api/generate/job/[id]` — polling stato job. **LIVE**
- `POST /api/jobs/run` — worker pull-based (claim atomico via RPC, esecuzione, storno idempotente). **LIVE** (gira su worker esterno, protetto da `WORKER_SECRET`)
- `GET /api/poses` — libreria pose da storage. **LIVE** (esiste; un export precedente lo aveva mancato)
- `POST /api/enhance-prompt` — migliora il prompt. **LIVE/esiste** (comportamento da confermare)
- `POST /api/filter` — filtro/moderazione. **LIVE/esiste** (da confermare)
- `POST /api/echo-test` — endpoint diagnostico ECHO. **esiste** (dev)
- `POST /api/edit/interpret` — "dimmi cosa cambiare" in linguaggio naturale → parametri editor. **esiste** (da confermare se collegato all'UI)
- `POST /api/edit/render` — resa server-side con sharp (upscale, crop piattaforma, provenienza EXIF/stegano), scarica il modificato. **LIVE**
- `POST /api/edit/save` — salva `edit_state`. **LIVE**

### Avatar / creazione / identità
- `POST /api/avatar/create` — crea avatar (calcola e salva `identity_match` di pre-screening). **LIVE**
- `POST /api/avatar/analyze` — analisi volto a supporto creazione. **LIVE**
- `POST /api/avatar/soul` — collegamento Soul Higgsfield. (da confermare)
- `POST /api/avatar/booking` — flag disponibilità ingaggi. **GATED/STALE** (vedi §11)
- `GET/POST /api/avatar/wallet` — wallet on-chain dell'avatar. **STALE** (seme on-chain)

### KYC / identità
- `POST /api/kyc/didit/start` — avvia sessione Didit. **REALE** (richiede `DIDIT_API_KEY` + `DIDIT_WORKFLOW_ID`)
- `POST /api/kyc/didit/webhook` — webhook firmato (anti-replay 300s), transita `kyc_status`. **REALE** (richiede env)
- `POST /api/kyc/submit` — upload manuale documento+selfie+foto, bucket privato. **LIVE**
- `POST /api/kyc/stub` — NO-OP: marca `kyc_status='approved'` senza verificare (sblocco dev). **STUB**

### Volt / pagamenti
- `GET/POST /api/volt` — saldo/movimenti VOLT. **LIVE**
- `POST /api/admin/volt` — accredito manuale admin (`admin_grant`). **LIVE**
- `POST /api/payout` — storno royalty (provider 'mock', azzera `royalty_accrued_cents`). **STUB** (Stripe Connect TODO)

### Ward
- `POST /api/ward/scan` — scan real-time (consent gate + ownership + rate-limit 6/h). **LIVE**
- `POST /api/ward/activate` — attiva monitoraggio (`monitoring_consents`). **LIVE**
- `POST /api/ward/evidence` — cattura prova (screenshot+HTML+WHOIS+hash). **LIVE** (capture headless è placeholder)
- `POST /api/match/alert` — "avvisami" se compare un volto adatto. **LIVE** (UI non ancora collegata)
- `POST /api/veto/register` — registrazione inversa (diritto all'oblio generativo): crea avatar `protection_only` + faceprint difensivo. **LIVE**

### Admin / operatori
- `POST /api/admin/kyc` — approva/rifiuta KYC + bonus benvenuto VOLT. **LIVE**
- `POST /api/admin/review` — approva avatar (`verification_status`). **LIVE**
- `POST /api/admin/kyb` — approva/rifiuta KYB enterprise. **LIVE**
- `POST /api/admin/reports` — gestione segnalazioni abuso. **LIVE**
- `POST /api/admin/face-index` — costruisce/aggiorna l'indice volti. **LIVE**
- `POST /api/admin/anchor` — ancoraggio on-chain avatar (Base). **STALE/GATED**
- `POST /api/admin/soul-ids` — sync Soul ID Higgsfield. (da confermare)

### B2B / contatti / sedi / vari
- `POST /api/enterprise/register` — registrazione agenzia (KYB). **LIVE**
- `POST /api/business/inquiry` — richiesta business (studio/enterprise). **LIVE**
- `POST /api/partner/apply` — candidatura partner/fotografo. **LIVE**
- `POST /api/contact` — modulo contatti. **LIVE**
- `POST /api/scan/booking` — prenotazione scansione in sede (Stripe dormiente). **LIVE/GATED**
- `GET /api/nft/identity/[id]` — metadati NFT identità (on-chain). **STALE**
- `POST /api/csp-report` — report CSP (sicurezza). **LIVE**
- `POST /api/dev/stego-selftest` — self-test steganografia (dev). **dev**
- `GET /feed.xml` — feed RSS del blog. **LIVE**

---

## 6. Data model (30 tabelle in produzione, RLS attivo ovunque)

> Tabella `avatars` = cuore del sistema, **47 colonne**.

### `avatars` (12 righe) — il volto e i suoi diritti
Chiave: `id`, `handle` (unique), `alias`. Identity kit: `gender`, `age_range`, `ethnicity`, `hair_color`, `eye_color`, `body_type`, `height`, `facial_hair`, `glasses`, `tattoos`, `language`. Consenso/diritti: `consent_start`, `consent_end`, `revoked_at`, `commercial_consent` (bool, default true; **modello senza categorie**), `consent_token`, `person_consented_at`. Registro: `tier` (check `SPARK|SHAPE|SOUL|HUMAN`), `verification_status` (default `approved`), `is_demo`, `is_public_figure`, `protection_only` (VETO), `available_for_booking`, `scan_source` (default `self`; oggi 11/12 = `studio`, 1 = `self`), `soul_ref` (id Higgsfield). Economia: `usage_count`, `royalty_accrued_cents`, `price_multiplier`. Profilo pubblico: `real_name`, `instagram`, `facebook`, `gallery_urls` (array), `portrait_url`. On-chain (semi, inattivi): `soulbound` (default true), `owner_wallet`, `chain`, `onchain_token_id`, `onchain_tx`, `anchored_at`. Identità: **`identity_match` (jsonb)** = pre-screening match volto (doc/selfie/foto) calcolato on-device alla creazione (aiuto alla certificazione, mai prova). FK: `owner_id`→auth.users, `org_id`→organizations.

### Consenso e generazione
- `consent_events` (14) — timeline immutabile: `event_type` (`GRANTED|CATEGORY_ADDED|CATEGORY_REMOVED|REVOKED`), `detail`, `occurred_at`. (gli eventi CATEGORY_* restano per retro-compat storica; il modello attuale è sì/no).
- `generations` (56) — output: `certificate`, `image_url`, `prompt`, `category`, `mode` (preview/commercial), economia (`gross_cents`/`fee_cents`/`royalty_cents`/`engine_cost_cents`), `engine_ref`, `tier`, campi fotografici (`camera`/`lens`/`light`/`color_style`/`framing`/`expression`), `edit_state` (jsonb editor), `upscale`, `export_format`.
- `generation_jobs` (47) — coda async: `status` (`pending|running|done|error`), `engine` (default `echo`), `params` (jsonb), economia, `attempts`, timestamp. La coda È il DB (no broker esterno).

### Identità / utenti / economia
- `profiles` (30) — `email`, `full_name`, `role` (`buyer|seller|admin|enterprise|manager`), `kyc_status` (`none|pending|approved|rejected`), **`identity_face_descriptor` (jsonb, 128-d FaceNet del volto verificato Didit)**, `identity_session_id`. RLS self-access; trigger `lock_profile_privileges` impedisce auto-elevazione.
- `volt_transactions` (39) — ledger append-only: `type` (`recharge|generation|bonus|refund|admin_grant`), `delta_volt`, `balance_after`, `ref`. RPC: `volt_balance`, `spend_volt`, `grant_volt` (advisory lock + idempotenza).
- `payouts` (0) — storni royalty (mock).

### Ward (protezione)
- `monitoring_consents` (1) — consenso al monitoraggio: `scope` (`open_web`), `on_match` (`notify|auto`), `granted_at`/`expires_at`/`revoked_at`.
- `scan_jobs` (1) — job di scan: `status`, `provider`, `stats` (jsonb).
- `scan_candidates` (1) — candidati transitori (cancellati post-scan; si tiene solo il `phash`).
- `scan_matches` (0) — match: `source_url`, `host`, `score`, `band` (`confirmed|review`), `sensitivity` (`standard|sensitive|minor`), `phash`, `ai_verdict`.
- `evidence_records` (1) — prove: `screenshot_path`, `html_path`, `whois` (jsonb), `hash` (SHA256), `anchored_at`.
- `nemesis_actions` (0) — azioni legali: `kind` (`dmca|gdpr17`), `status` (`drafted|sent|host_pending|removed|legal|escalated`). Schema pronto, orchestrazione finta.
- `allowlist` (0) — host autorizzati (schema, nessuna UI).
- `protection_alerts` (0) — alert al titolare di volto protetto (placeholder).
- `audit_log` (7) — log append-only (service-only).
- `match_alerts` (1) — "avvisami" del catalogo. `match_searches` (53) — log ricerche.

### Marketing / B2B / academy / contatti
- `organizations` (0) — agenzie: `kyb_status` (`pending|approved|rejected`), `vat_number`, `country`, ecc.
- `business_inquiries` (2), `partner_applications` (1), `contact_messages` (0).
- `sedi` (1) + `scan_bookings` (1) — sedi di scansione + prenotazioni (Stripe dormiente).
- `corsi` (3), `lezioni` (0), `progressi` (0), `certificazioni` (0) — Academy (impalcatura).
- `abuse_reports` (3) — segnalazioni: `reason` (`no_consent|impersonation|misuse|illegal|other`), `status`.
- `blocked_requests` (10) — log richieste bloccate (trasparenza): `reason` include `protected_face`, `revoked`, `no_match`.
- `rate_limit_hits` (28) — rate-limiting.

---

## 7. MODULO A — Registro / Passaporto / Consenso / Sigil

**Cosa fa.** Il passaporto pubblico mostra il volto reale consenziente, l'identity kit immutabile, l'atto di proprietà, la timeline del consenso (continua se attivo, **interrotta** se revocato) e un repertorio di generazioni watermarkate. Il verificatore **Sigil** prova che un'immagine è certificata (filigrana invisibile) o riconosce il volto sul registro (face-search on-device).

- **Passaporto** (`/passport/[handle]`): **LIVE**. Hero full-bleed, badge (`SCANSIONE UFFICIALE` salvia vs `AUTO-SCANSIONE`), pannello vetro, sezioni numerate (01 Atto di proprietà, Identity kit, Token, Timeline, Consenso), statistiche, nota legale, segnala abuso. Sorgente registro: `lib/registry.ts` (`isPublicAvatar`: `verification_status='approved'` e non `protection_only`).
- **Sigil / verifica** (`/verify`, `/api/verify*`): **LIVE**. Filigrana LSB su canale blu (`lib/stegano*`), letta lato server (sharp) o client (WASM). Face-search senza retention (`lib/face-match`, `lib/face-index`), soglia FaceNet fissa, niente nomina sotto soglia. VETO: i volti `protection_only` non vengono mai nominati (`lib/protected-index`), e scatta un alert al titolare.
- **Consenso** (`/account/consent`, `/api/avatar/consent`): **LIVE**. Modello **sì/no senza categorie** (`commercial_consent`). Revoca prospettica + cancellazione delle foto-reference (oblio generativo). Timeline immutabile in `consent_events`. Conferma persona-nel-loop (`consent_token`, `person_consented_at`): **LIVE ma usata solo lato B2B**, non wired al signup web.
- **Ricevuta di conformità** (`/receipt/[cert]`): **LIVE**, JSON + pagina stampabile, senza dati biometrici. Non ancora agganciata al flusso di generazione.
- **Badge embeddabile** (`/badge`): **LIVE**, SVG dinamico che riflette la revoca entro 5 min.

**STALE/incoerenze in questo modulo (importante):**
- `tier` DB resta `SPARK/SHAPE/SOUL/HUMAN`, ma l'UI rimappa label (es. SOUL→ECHO). Nessuna migrazione, naming non allineato.
- `CATEGORIES` (consenso per categoria) ancora definito in `lib/types.ts` ma **non più usato** (Fase 2 → sì/no). Gli eventi `CATEGORY_*` restano per storico.
- `is_public_figure` → badge "Notorietà verificata": **GATED** (in attesa di parere legale sul pricing).
- `soulbound` + campi on-chain: **STALE**, sempre `true`/null, mai testati (seme di una fase futura).
- `available_for_booking` → CTA "Disponibile per ingaggi"/"Richiedi ingaggio": **GATED/STALE** (semplice link a `/contatti`, nessun vero flusso di booking).
- `scan_source`: **LIVE** ma di fatto tutti `studio`; il ramo "self / auto-scansione" non è ancora abilitato.

**Gap:** filigrana robusta in frequenza / C2PA-EXIF prevista ma non integrata nel flusso di generazione; wiring conferma-persona nel signup; ricevuta non agganciata alla generazione.

---

## 8. MODULO B — Generatore + Editor + Motori

**Cosa fa.** Il buyer sceglie un avatar verificato, descrive una scena, sceglie i parametri fotografici, e genera un'immagine **identity-locked** (la somiglianza viene dalle foto reali di reference, non dalle parole). La generazione commerciale è asincrona (coda DB + worker). L'editor rifinisce l'immagine (preset, luce, colore, HSL, curve, dettaglio) con anteprima live e resa server fedele.

- **Generatore** (`/match`, `/api/generate`, `/api/jobs/run`): **LIVE**. Preview sincrona; commerciale enqueue → polling. Worker pull-based con claim atomico (`claim_generation_jobs`), parallelo, con reaper dei job orfani e **storno VOLT idempotente** in caso di errore.
- **Motore attivo = ECHO** (`lib/engines/echo.ts`, OpenAI gpt-image-2): **LIVE**. Usa `/v1/images/edits` con reference-set fino a 8-10 foto reali per l'identity-lock (`lib/references.ts`), timeout 4 min, costo reale calcolato dai token (`lib/engines/echo-cost.ts`, markup ~1,6x).
- **Higgsfield Soul** (`lib/higgsfield.ts`, `lib/soul-models.ts`): **GATED/dormiente**. Codice completo (modalità mock + live) ma irraggiungibile perché `useEcho=true` è hardcoded in `/api/generate`. Catalogo Soul (soul-v2 HUMAN 2k, soul-id SHAPE) presente ma scollegato.
- **Prompt** (`lib/echo-prompt.ts`, `lib/studio-options.ts`): **LIVE**. Ordine identità → posa → extra → fotografico → scena; cataloghi whitelist (camera/obiettivo/luce/colore/inquadratura/espressione/pose) con token canonici lato client e server.
- **Editor** (`/studio/edit/[cert]`, `/api/edit/render|save|interpret`, `lib/editor/*`): **LIVE**. Pipeline pixel-reale condivisa anteprima/server (`lib/editor/pipeline.ts`), 12 preset, curve per canale, mixer HSL a 8 colori, nitidezza/chiarezza/texture/vignetta/grana. Export con sharp: upscale 2k/4k, crop per piattaforma, provenienza EXIF + stegano. Salva/riapre `edit_state`. La barra "dimmi cosa cambiare" (`/api/edit/interpret`) esiste; verificare l'aggancio UI.

**STALE/incoerenze:** Higgsfield hardcoded off (serve un flag/switch per passare ECHO↔Soul); provenienza "C2PA vera" non implementata (solo EXIF+stegano semplice); `/studio` hub è un guscio; il face-scan anti-protezione nel worker è dormiente se manca `tfjs-node`.

**Gap:** switch motore in produzione; rate-limit per avatar (oggi solo per utente); unificazione preview sincrona vs async.

---

## 9. MODULO C — Ward (anti-deepfake) + funnel protetto

**Cosa fa.** Ward protegge i volti registrati come `protection_only`: scansiona il web aperto, rileva usi non autorizzati, **conferma** ogni ritrovamento con face-matching, conserva prove immutabili e (in futuro) lancia takedown legali. UI a 4 tab: **Radar** (panoramica), **Trovati/Detections**, **Nemesis** (lo strike), **Vault** (archivio prove). Tre stati d'accesso: locked / demo / full.

- **Entry & gate** (`/ward`, `lib/ward/entitlement*`): **LIVE**. `locked` (non loggato o senza avatar) → 3 pannelli (Provala / Hai già un avatar / Proteggiti ora); `demo` (avatar senza monitoraggio); `full` (monitoraggio attivo → dati reali).
- **Demo pubblica** (`/ward/demo`): **LIVE**, 100% client-side (nessun backend).
- **Scan** (`/api/ward/scan`, `lib/ward/scan.ts`): **LIVE**. Pipeline: consent gate inviolabile (A2.1) → carica descrittori di reference → discovery → per candidato embed+match+phash → salva match / scarta. Data-minimization: i byte/descrittori dei candidati terzi NON vengono mai persistiti (solo URL+phash+score).
- **Discovery** (`lib/ward/discovery/*`): **CONDIZIONALE**. Google Vision WEB_DETECTION se `GOOGLE_VISION_API_KEY` presente, altrimenti **STUB** con candidati finti. Nessun invio di volti a face-search di terzi (solo content-based). Override con `WARD_DISCOVERY`.
- **Matching** (`lib/ward/matching/*`): **LIVE**. FaceNet 128-d server-side (face-api node-wasm), distanza euclidea, bande `confirmed ≤0.5` / `review ≤0.6` (env-tunable), coerente con la soglia del KYC.
- **Evidence** (`/api/ward/evidence`, `lib/ward/evidence/*`): **PARZIALE**. WHOIS RDAP + hash SHA256 reali; lo screenshot headless è un placeholder.
- **Nemesis** (UI `NemesisOps`/`NemesisStrike`): **STUB**. Schema `nemesis_actions` pronto (DMCA/GDPR17), ma **nessun endpoint di invio reale**: lo strike è animazione client.
- **Child-safety**: **LIVE** end-to-end (minori → "[host riservato]", niente Vault, riferimento alle autorità).
- **Funnel protetto** (`/signup/avatar/protected`): KYC (oggi **stub**) → cattura 3 foto volto (128-d in browser) → consenso Ward (`/api/ward/activate`) → "Sei protetto". Modulo VETO (`/api/veto/register`) crea l'avatar `protection_only` con faceprint difensivo (consenso Art. 9).

**STALE/incoerenze:** naming "Sentinel" residuo in qualche copy (deve essere **Ward**); label "Detections" vs "Trovati"; `ai_verdict` letto/mostrato ma non ancora calcolato; `anchored_at` mai valorizzato; `allowlist`/`protection_alerts`/`match_alerts` hanno schema ma flusso UI non collegato; scan sincrono (ok su worker, non su serverless).

---

## 10. MODULO D — Identità/KYC + Volt + Account/Admin + Marketing + B2B

### KYC e identità
- **Didit** (`lib/kyc/didit.ts`, `/api/kyc/didit/*`): **REALE ma GATED**. Webhook firmato + anti-replay; richiede `DIDIT_API_KEY` + `DIDIT_WORKFLOW_ID`. Senza env → fallback **stub**.
- **KYC manuale** (`/api/kyc/submit`, coda `/account/kyc`): **LIVE**. Upload documento+selfie+foto in bucket privato; l'operatore decide a mano, aiutato dal pre-screening.
- **Confronto volti anti-impersonazione** (`lib/identity-match.ts`, `lib/face-match.ts`, `lib/kyc/identity-face.ts`): **LIVE**. Il volto verificato (128-d, salvato in `profiles.identity_face_descriptor`) viene confrontato con le foto caricate per avatar/Ward (band strong ≤0.5 / review ≤0.6). Nota: questo gate era fail-open silenzioso su Vercel (mancavano modelli/wasm nella lambda); **fix deployato il 2026-06-23** (`outputFileTracingIncludes` + `maxDuration`), runtime end-to-end da confermare col test Didit.
- **KYC stub** (`/api/kyc/stub`): **STUB** voluto, sblocca i flussi gated in dev.

### Economia Volt
- Ledger `volt_transactions` + RPC atomiche (`grant_volt`/`spend_volt`/`volt_balance`): **LIVE**. 1 VOLT = 1 centesimo. Bonus benvenuto idempotente alla verifica KYC. Accredito manuale admin (`/api/admin/volt`): **LIVE** (ponte pre-Stripe, vendita via bonifico).
- **Stripe per ricarica VOLT: assente.** I pacchetti sono visibili in `/account/volt` ma il CTA è disabilitato ("a breve"). `lib/stripe.ts` esiste solo per il booking scansione, ed è no-op senza `STRIPE_SECRET_KEY`.
- **Payout** (`/api/payout`): **STUB** (mock provider, Stripe Connect TODO). Split royalty: 80% persona / 20% piattaforma (`lib/wallet.ts`).

### Account / Auth / Admin
- Auth email+password (Supabase), profilo auto-creato, ruoli `buyer/seller/admin/enterprise/manager`, colonne sensibili protette da trigger: **LIVE**.
- Pannelli admin (service-role, bypass RLS): coda KYC, review avatar, KYB, segnalazioni, face-index builder: **LIVE**. Anchor on-chain / soul-ids: **STALE/da confermare**.

### Marketing / pubblico
- Homepage (`/`): **LIVE**, contatori reali (avatar pubblici, volti protetti, blocchi del mese) + 8 avatar in vetrina (prima quelli con galleria, poi per `usage_count`). Sezioni in `components/marketing/*` (Hero, Impact, Registry, Trust, WardSection, ScanLocations, ToolsBusiness, ClosingCTA), con motion (framer/gsap/three/leaflet).
- Blog (`/blog`): **LIVE**, file-based `content/blog/*.md`. Filtri categoria/tag mostrati ma non navigabili.
- Trasparenza/legali/FAQ/prezzi/partner/sviluppatori: pagine presenti (alcune da riempire).

### Enterprise / B2B
- KYB self-serve (`/enterprise/register`, `/api/enterprise/register`) + coda admin (`/api/admin/kyb`): **LIVE**. Tabelle `organizations`, `business_inquiries`, `partner_applications`. Licenza prioritaria di categoria: **concept futuro**.

---

## 11. Quadro consolidato LIVE / STUB / GATED / STALE

| Area | Stato | Nota chiave |
|---|---|---|
| Passaporto pubblico + Sigil verifica | **LIVE** | Filigrana + face-search on-device |
| Consenso sì/no + timeline + revoca prospettica | **LIVE** | `commercial_consent`, oblio generativo |
| Ricevuta conformità + badge | **LIVE** | Non agganciati alla generazione |
| Generatore (motore ECHO/OpenAI) | **LIVE** | Async + worker + storno idempotente |
| Higgsfield Soul | **GATED** | `useEcho=true` hardcoded, ramo dormiente |
| Editor post-produzione | **LIVE** | Resa sharp fedele, salva/riapri |
| Ward scan + matching + discovery | **LIVE/CONDIZIONALE** | Vision se chiave, altrimenti stub |
| Ward evidence (screenshot headless) | **PARZIALE** | WHOIS+hash reali, screenshot placeholder |
| Nemesis (DMCA/GDPR17) | **STUB** | Schema pronto, nessun invio reale |
| Funnel protetto / VETO | **LIVE** | KYC al suo interno è stub |
| KYC Didit | **REALE/GATED** | Mancano env → fallback stub |
| Confronto volti anti-impersonazione | **LIVE** | Fix Vercel 2026-06-23, da confermare runtime |
| Volt ledger + accredito admin | **LIVE** | Atomico, idempotente |
| Ricarica Volt via Stripe | **GATED/assente** | CTA disabilitato |
| Payout royalty | **STUB** | Mock, Stripe Connect TODO |
| Auth + ruoli + admin | **LIVE** | RLS + trigger anti-elevazione |
| Marketing/home/blog | **LIVE** | Blog file-based |
| Enterprise KYB | **LIVE** | Licenza categoria = futuro |
| On-chain (soulbound/anchor/NFT) | **STALE** | Semi inattivi, mai testati |
| Academy (corsi) | **STUB** | Impalcatura DB, niente lezioni |

---

## 12. Concetti STALE / incoerenze da risolvere (lista secca)

1. **`tier` SPARK/SHAPE/SOUL/HUMAN**: enum DB invariato, label UI rimappate (SOUL→ECHO). Decidere: tenere i tier? rinominarli? eliminarli dal passaporto?
2. **Consenso per categoria** (`CATEGORIES`, eventi `CATEGORY_*`): residuo del vecchio modello, ora sì/no. Da ripulire.
3. **`available_for_booking` / "Disponibile per ingaggi"**: oggi è solo un link a `/contatti`, non un flusso. Tenere o togliere?
4. **`is_public_figure` / "Notorietà verificata"**: gated su parere legale.
5. **On-chain**: `soulbound`, `owner_wallet`, `chain`, `onchain_*`, `/api/nft/identity`, `/api/admin/anchor`, `viem`. Tutto inattivo. Decidere se è roadmap o va rimosso.
6. **Higgsfield dormiente**: `useEcho=true` hardcoded. Serve la strategia motori (ECHO vs Soul vs entrambi).
7. **KYC stub vs Didit reale**: in prod servono le env Didit; lo stub va chiuso prima del go-live.
8. **Stripe assente** (ricarica Volt + payout + booking): è il blocco principale alla monetizzazione reale.
9. **Nemesis stub**: l'enforcement legale (DMCA/GDPR17) è il cuore di Ward ma non invia nulla.
10. **Naming "Sentinel"** residuo: ovunque deve essere **Ward**.
11. **Ricevuta/C2PA** non agganciate alla generazione; filigrana non robusta a JPEG/resize.
12. **Academy**: impalcatura senza contenuti, decidere priorità.

---

## 13. Gap principali per il go-live (sintesi)

- **Pagamenti reali**: Stripe Checkout (ricarica Volt), Stripe Connect (payout). Senza, niente euro veri in/out.
- **KYC reale in produzione**: configurare Didit (env su Vercel) e chiudere lo stub.
- **Enforcement Ward**: backend Nemesis (generazione + invio DMCA/GDPR17) e screenshot headless reale.
- **Strategia motori**: decidere ECHO vs Higgsfield e renderla switchabile.
- **Pulizia concetti stale** (tier, categorie, on-chain, ingaggi) per coerenza del passaporto e del messaggio.
- **Provenienza forte**: C2PA/EXIF nel flusso di generazione + filigrana robusta.

---

## 14. Domande aperte per la nuova roadmap (da decidere)

1. Qual è il **primo flusso che fa girare l'euro vero**? (ricarica Volt? scansione in sede? licenza enterprise?)
2. **Generatore**: resta ECHO/OpenAI o si passa a Higgsfield Soul (qualità identità superiore)? O scelta per tier?
3. **On-chain**: è parte della visione (titolo del volto on-chain) o si rimuove per semplicità?
4. **Ward**: si porta Nemesis a enforcement reale adesso, o resta dimostrativo finché non c'è volume?
5. **Tier dei livelli**: si mantengono SPARK/SHAPE/SOUL/HUMAN o si semplifica a "verificato/non"?
6. **B2B vs B2C**: la priorità è il creatore singolo (persona che protegge/monetizza il volto) o l'agenzia/azienda (roster + licenze)?
7. **KYC**: Didit per tutti, o solo per chi vuole monetizzare (e protezione più leggera per chi vuole solo Ward)?

---

*Fine export. Documento generato dal codice e dal DB reali il 2026-06-23. Tutto ciò che è marcato STUB/GATED/STALE non è ancora pronto per la produzione anche se il guscio esiste.*
