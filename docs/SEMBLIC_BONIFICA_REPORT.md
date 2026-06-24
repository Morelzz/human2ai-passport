# SEMBLIC — Bonifica sicurezza: report di verifica + stato

> Lavoro sul ramo `bonifica-sicurezza` (da `f1ec65b`). **Niente pushato, niente deploy, nessuna modifica al DB di produzione.** Scope concordato: SOLO hardening sicurezza/legale fail-closed (le scelte di prodotto restano fuori). Vincolo assoluto: i 12 avatar founder NON si toccano.
>
> Metodo: ogni rilievo dell'audit `SEMBLIC_AUDIT_TECNICO_UX.md` e stato verificato sul codice REALE (5 esploratori), poi marcato. L'audit nasceva dall'export, quindi piu pessimista del codice vero.

## Esito sintetico

- **Gia risolto nel codice (l'audit sbagliava):** CRIT-1, A3, A4, A6, A9, A10, B7, B8, CRIT-8 (parziale), B11 (report-only, corretto per ora).
- **Fatto in questa sessione (7 commit, con test, tsc 0, 92 test verdi):** A12, CRIT-4, CRIT-9, A1, CRIT-6, A2, + alias `@/` per i test.
- **Confermati, da fare:** CRIT-3, CRIT-7, CRIT-10, A5, A13, M11, M12, M13, CRIT-2 (default).

## Tabella verdetti (sicurezza/legale)

| ID | Verdetto | Nota dal codice reale |
|---|---|---|
| CRIT-1 verification_status default | GIA RISOLTO | `/api/avatar/create` forza gia `pending_review`; il default DB e solo fallback di compat. |
| CRIT-2 commercial_consent default | DA FARE (schema) | La create imposta il valore esplicito; il default colonna resta `true`. Invertirlo a `false` e difesa in profondita (serve migrazione, prod). |
| CRIT-3 consenso persona web | CONFERMATO | `person_consented_at` resta NULL per gli avatar privati creati dal web (token solo Enterprise). |
| CRIT-4 stub KYC | **FATTO** | Guardia: in prod lo stub risponde 410 + allarme. (Resta: colonna `kyc_provider` + bonus solo per non-stub: schema.) |
| CRIT-6 gate identita fail-open | **FATTO** | Distingue "modelli giu" (errore tipato -> 503 + allarme, non crea un avatar non verificato) da "nessun volto/riferimento" (revisione manuale, invariato). Flusso normale intatto, test incluso. |
| CRIT-7 VETO worker dormiente | CONFERMATO | `lib/face-scan-server.ts` con `tfjs-node` assente -> `available:false` e la generazione passa. **Ora almeno allarma (A12).** Il flip a fail-closed va coordinato con tfjs-node sul worker, altrimenti blocca OGNI generazione. |
| CRIT-8 discovery Ward | GIA RISOLTO (+allarme) | Lo stub ha host palesemente finti, non matcha, non inquina le prove; in prod senza chiave lo scan fallisce a monte. Aggiunto allarme se cade su stub in prod. |
| CRIT-9 disclaimer Sigil | **FATTO** | Aggiunto `disclaimer` "indizio non prova" alle risposte di `/api/verify-face`. (Il codice gia non nominava sotto soglia.) |
| CRIT-10 age-gate | CONFERMATO | Nessun controllo eta nel signup. Da aggiungere (UI + eventuale colonna `age_verified_at`). |
| A1 payout azzera royalty | **FATTO** | Senza provider reale il payout e no-op e NON azzera il saldo. Test incluso. |
| A2 revoca in volo | **FATTO** | Il worker rilegge `revoked_at`/`commercial_consent`/`protection_only` prima del render; se revocato annulla e storna. Gate puro (`lib/consent-gate.ts`) testato. |
| A3 ledger drift | GIA RISOLTO | `grant_volt`/`spend_volt` ricalcolano `balance_after` dentro l'advisory lock. |
| A4 paga-poi-produci | GIA RISOLTO | Storno idempotente prima di tornare errore. |
| A5 dead-letter | CONFERMATO | Nessun cap retry / stato terminale. Serve colonna/stato (schema) + backoff. |
| A6 watermark LSB | GIA RISOLTO | Gia trattato come segnale debole + EXIF di provenienza; mai spacciato per prova. |
| A8 is_demo nel registro | NON TOCCARE | By-design finche non entrano i reali. **I 12 founder restano**: se flaggati `is_demo`, il flag e da correggere (reali), non da escludere. |
| A9 stati contraddittori | GIA RISOLTO | VETO forza `commercial_consent=false`; consent API blocca i `protection_only`. CHECK SQL opzionale (schema). |
| A10 append-only | GIA RISOLTO | `consent_events`/`audit_log` strutturalmente solo-insert, nessun grant UPDATE. |
| A12 allarmi su degrado | **FATTO** | `lib/observability.ts`: ogni fallback a stub/scan-non-disponibile e visibile (console + Sentry in prod). |
| A13 rate-limit | CONFERMATO (grave) | La RPC `check_rate_limit` NON esiste: `allowRequest` fa fail-open (ritorna true). Il rate-limit oggi e di fatto assente. Serve la RPC (schema). |
| B7 endpoint dev | GIA RISOLTO | `/api/echo-test` e `/api/dev/stego-selftest` gia bloccati in prod (NODE_ENV/VERCEL_ENV). |
| B8 price_multiplier | GIA RISOLTO | CHECK `> 0` gia presente. |
| B11 CSP | OK PER ORA | Report-only volutamente (transizione). Enforce quando i report sono puliti. |
| M11 freschezza indice volti | CONFERMATO | Nessun rebuild automatico su revoca/approvazione. Serve endpoint + trigger applicativo. |
| M12 consent_token | CONFERMATO | Nessuna scadenza/uso-singolo. Serve colonna scadenza (schema). |
| M13 owner vs persona ritratta | CONFERMATO (debito) | Il modello non distingue chi carica da chi e ritratto. Refactor futuro. |

## Cosa e stato fatto (commit sul ramo)

1. `test:` alias `@/` in `vitest.config.ts` (abilita i test dei moduli dell'app).
2. `A12:` `lib/observability.ts` + cablaggio in discovery Ward e VETO scan + test.
3. `CRIT-4:` guardia stub KYC solo in sviluppo + allarme.
4. `A1:` payout no-op che non azzera le royalty + helper `payoutProviderConfigured` + test.
5. `CRIT-9:` disclaimer "indizio non prova" nel face-search.
6. `A2:` re-check di revoca/consenso nel worker prima del render + `lib/consent-gate.ts` puro + test.
7. `CRIT-6:` gate identita fail-closed (errore tipato + allarme + 503 nella create) + test.

Verifica: `tsc --noEmit` exit 0; `vitest` 92/92 verdi. Nessun publish.

## Cosa resta, raggruppato per cosa serve

**A. Codice fail-closed delicato (serve verifica/coordinamento, NON publish):**
- CRIT-7: flip del VETO worker a fail-closed, SOLO dopo `tfjs-node` funzionante sul worker (altrimenti blocca OGNI generazione). Health-check all'avvio. Per ora gia allarmato via A12.
- (CRIT-6 e A2: FATTI in questa sessione.)

**B. Serve migrazione sul DB di PRODUZIONE (da applicare solo col tuo ok):**
- CRIT-2 (default `commercial_consent=false`, con UPDATE esplicito prima sui founder).
- CRIT-4 colonna `kyc_provider` + bonus solo non-stub.
- A5 stato `dead_letter` + cap retry su `generation_jobs`.
- A13 RPC `check_rate_limit` + tabella (oggi il rate-limit e assente).
- M12 scadenza `consent_token`.
- A9 CHECK di coerenza (opzionale).

**C. Flusso + decisione di prodotto-vicino:**
- CRIT-3 conferma persona nel signup web (obbligatoria per pubblico/commerciale). Per i founder: back-fill del consenso firmato, non farli cadere nel gate.
- CRIT-10 age-gate in registrazione.
- M11 rebuild automatico dell'indice volti su revoca/approvazione.

**D. Binario legale (tuo, non codice):**
- A7 DPA OpenAI + transfer extra-UE, A14 PITR/backup, M3 retention log, M18 procedura di erasure, pagine legali.

## Prossimo passo consigliato

Continuare sul gruppo A (CRIT-6, A2: codice, su ramo, con test, niente publish), poi proporti in blocco le migrazioni del gruppo B con l'impatto sulle 12 righe founder, da applicare solo col tuo ok.
