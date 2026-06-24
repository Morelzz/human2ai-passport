# SEMBLIC — Bonifica: migrazioni DB proposte (BOZZE, NON applicate)

> Queste sono **bozze**: i file `.sql` sono nel repo ma **NESSUNA e stata applicata** al database di produzione. Toccano il DB condiviso, quindi attendono il tuo "applica" esplicito, una alla volta. Per ognuna: cosa fa, impatto sulle righe esistenti, sicurezza dei 12 founder, e se serve codice dopo.
>
> Quando vuoi: dimmi "applica la X" (o "applica tutte tranne…") e le applico io via connettore, mostrando l'SQL e verificando lo schema dopo. I founder non vengono mai toccati.

## Applicate

- **A13** e **CRIT-2** applicate e VERIFICATE il 2026-06-24: rate-limit ora attivo (fail-open chiuso, anche sul live perche il DB e condiviso), default `commercial_consent` = false. Righe esistenti e founder intatti (11 commerciali + 1 protetto, identico a prima).
- **M12, A9, CRIT-4, A5** applicate e VERIFICATE il 2026-06-24: colonna scadenza token; vincolo di coerenza (0 righe violanti); colonna `kyc_provider` (10 profili approvati backfillati a 'manual'); stato `dead_letter`. **Tutte e 6 le migrazioni applicate.** Restano i CODICI-dopo: CRIT-4 (bonus solo non-stub + set provider), M12 (valorizza+verifica scadenza), A5 (worker cap-retry + backoff).

## Riepilogo

| File | ID | Cosa fa | Impatto righe esistenti | Codice dopo? |
|---|---|---|---|---|
| `bonifica_crit2_consent_default.sql` | CRIT-2 **APPLICATA** | Default `commercial_consent` -> false (verificato) | **Nessuno** (default solo sui nuovi) | No |
| `bonifica_crit4_kyc_provider.sql` | CRIT-4 **APPLICATA** | Colonna `profiles.kyc_provider` + backfill 'manual' (10 profili) | Fatto | Si (bonus solo non-stub) |
| `bonifica_a13_rate_limit.sql` | A13 **APPLICATA** | RPC `check_rate_limit` (ora ATTIVA, fail-open chiuso) | Nessuno (solo funzione) | No (gia cablato in `allowRequest`) |
| `bonifica_m12_consent_token_expiry.sql` | M12 **APPLICATA** | Colonna `consent_token_expires_at` | Nessuno | Si (valorizza+verifica scadenza) |
| `bonifica_a5_dead_letter.sql` | A5 **APPLICATA** | Stato `dead_letter` su `generation_jobs` | Nessuno (solo enum) | Si (cap retry + backoff nel worker) |
| `bonifica_a9_coherence_check.sql` | A9 **APPLICATA** | CHECK: protezione => non commerciale | Nessuno (0 righe violanti) | No |

## Ordine consigliato

1. **A13** (rate-limit reale) — alto valore, zero impatto, nessun codice dopo: il primo da accendere.
2. **CRIT-2** (default consenso) — zero impatto, fail-closed sui nuovi avatar.
3. **CRIT-4** (kyc_provider) — additivo; poi cablo il bonus VOLT solo per i KYC reali.
4. **M12** (scadenza token) — additivo; poi cablo valorizzazione e verifica.
5. **A9** (coerenza) — opzionale, dopo aver verificato che `select count(*) from avatars where protection_only and commercial_consent` = 0.
6. **A5** (dead_letter) — per ultima: prima confermo il nome del constraint, poi scrivo il codice del worker (cap retry + backoff).

## Note di sicurezza

- **Founder (12 avatar reali):** nessuna di queste migrazioni li modifica. CRIT-2 non tocca le righe esistenti; CRIT-4 li marca correttamente 'manual' (verificati in studio); A9 non li riguarda (sono pubblici, non protection_only).
- **Reversibilita:** CRIT-2, A13, M12, A5, A9 sono reversibili (drop colonna/funzione/constraint o ripristino default). CRIT-4 il backfill e un valore informativo, non distruttivo.
- **Righe esistenti toccate:** solo CRIT-4 (UPDATE informativo su `profiles`) e potenzialmente A9 (solo se ci fossero righe incoerenti, da sistemare prima). All'apply di queste due puo servire un "applica" esplicito per il classifier.

## Cosa NON e in queste migrazioni (resta codice/decisione)

- **CRIT-7** (VETO worker fail-closed): serve `tfjs-node` sul worker, non una migrazione.
- **CRIT-3 / CRIT-10** (consenso-persona + age-gate sul web): flusso + decisione di prodotto, con il back-fill del consenso firmato dei founder.
- **M11** (rebuild automatico indice volti): codice (trigger applicativo su revoca/approvazione).
- Il **binario legale** (DPA OpenAI, PITR, retention): tuo.
