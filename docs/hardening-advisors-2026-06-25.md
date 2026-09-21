# Hardening advisor SEMBLIC — 2026-06-25

Stato DB (`get_advisors`, progetto `ktjebfavzherochwhtis`): nessun ERROR/CRITICAL di
sicurezza. Sotto, le voci reali e cosa fare. NIENTE applicato (rituale: migrazioni
solo a "applica"; le riscritture RLS richiedono OK esplicito).

## 1. SICUREZZA

### rls_enabled_no_policy (INFO) — NON un buco, lasciare com'e'
Tabelle con RLS attivo e nessuna policy = **deny-all** (accesso solo via service_role
lato server). E' il default sicuro voluto dalla bonifica per le tabelle service-only:
`audit_log, scan_candidates, scan_bookings, rate_limit_hits, blocked_requests,
abuse_reports, business_inquiries, contact_messages, partner_applications,
protection_alerts, match_searches, corsi, lezioni, sedi`.
NON aggiungere policy: le APRIREBBE. Verificato che gli insert pubblici (form
contatti/business) passano da route server con service client.

### auth_leaked_password_protection (WARN) — toggle dashboard (decisione del founder)
Supabase Auth puo' rifiutare password compromesse (check HaveIBeenPwned). Oggi OFF.
Abilitare da: Dashboard Supabase -> Authentication -> Policies / Password security ->
"Leaked password protection". Non e' una migrazione: e' un interruttore di progetto.

## 2. PERFORMANCE

### A. Foreign key senza indice (INFO) — PRONTO PER "applica" (sicuro, additivo)
Migrazione idempotente, solo CREATE INDEX IF NOT EXISTS (nessun lock pesante su
tabelle piccole; per tabelle grandi valutare CONCURRENTLY, ma qui sono piccole):

```sql
-- migrazione: hardening_fk_indexes_2026_06_25
create index if not exists consent_events_avatar_id_idx on public.consent_events (avatar_id);
create index if not exists scan_matches_scan_job_id_idx on public.scan_matches (scan_job_id);
create index if not exists match_alerts_buyer_id_idx     on public.match_alerts (buyer_id);
create index if not exists organizations_owner_id_idx    on public.organizations (owner_id);
create index if not exists scan_bookings_sede_id_idx     on public.scan_bookings (sede_id);
create index if not exists certificazioni_corso_id_idx   on public.certificazioni (corso_id);
create index if not exists certificazioni_utente_idx     on public.certificazioni (utente);
create index if not exists progressi_lezione_idx         on public.progressi (lezione);
```

### B. auth_rls_initplan (WARN) — PRONTO MA RICHIEDE OK (riscrittura RLS, sensibile)
~25 policy valutano `auth.<fn>()` per riga invece di `(select auth.<fn>())`. Il fix
e' meccanico (wrap in select) ma tocca le definizioni delle policy: va generato dai
testi reali in `pg_policies` e ri-verificato che la semantica d'accesso non cambi.
Tabelle: profiles, avatars, generations, generation_jobs, volt_transactions,
match_alerts, organizations, progressi, certificazioni, consent_events, payouts,
monitoring_consents, scan_jobs, scan_matches, allowlist, evidence_records,
nemesis_actions. Procedura proposta a "applica": leggere `pg_policies`, per ogni
policy rigenerare USING/WITH CHECK sostituendo `auth.uid()` -> `(select auth.uid())`,
applicare in un'unica migrazione, ri-lanciare l'advisor per conferma.

### C. unused_index (INFO) — bassa priorita'
`allowlist_avatar_idx`, `audit_log_created_idx`, `avatars_onchain_tx_idx` mai usati.
Potrebbero esserlo a basso traffico/recenti: NON droppare ora, rivalutare piu' avanti.

## Riepilogo azioni
- Ora (a "applica"): la migrazione FK-index (sezione 2A) e' sicura e pronta.
- Founder (1 click): toggle leaked-password (sezione 1).
- A "applica" + OK: riscrittura RLS initplan (sezione 2B).
- Lasciare stare: rls-no-policy (deny-all voluto), unused_index.
