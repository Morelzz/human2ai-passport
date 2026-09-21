# Ward Module 1, Foundation, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire la fondazione di Ward (lo schema dati + RLS + il consent gate del monitoraggio + l'audit log), cioe' lo step 1-2 della build order del brief, che DEVE passare prima di qualsiasi path di scan.

**Architecture:** Tabelle Ward additive su Postgres/Supabase (RLS owner-scoped, service-role bypassa). La logica di validita' del consenso e' una funzione PURA testata a unita'; il gate `assertMonitoringConsent` la usa lato server (service role) e scrive sempre nell'audit log append-only. Niente discovery/scan in questo piano.

**Tech Stack:** Next 16 / React 19 / TypeScript, Supabase JS (`@supabase/supabase-js`), migrazioni via MCP `apply_migration` (le applica Claude: SQL prima, verifica dopo con `execute_sql`/`list_tables`). Unit test con **vitest** (devDependency nuova, solo per la logica pura).

**Riferimenti spec:** `docs/superpowers/specs/2026-06-19-ward-protected-avatars-design.md` (sez. 3.1, 3.3, 3.4; decisioni D5/D6).

**Branch:** tutto il lavoro su `ward-module1` (mai su master direttamente). Commit locali; push SOLO quando Morelz dice "pubblica". Comandi `npm`/`npx`/`tsc` eseguiti dalla cartella `F:/human2ai-passport`; `git` usa `-C`.

---

## Mappa dei file

- Create: `supabase/ward_module1.sql` — DDL di riferimento (mirror di cio' che applico via MCP).
- Create: `supabase/ward_module1_rls.sql` — policy RLS di riferimento.
- Create: `lib/ward/consent.ts` — logica PURA di validita' del consenso (no IO).
- Create: `lib/ward/consent.test.ts` — unit test vitest della logica pura.
- Create: `lib/ward/audit.ts` — helper append-only su `audit_log`.
- Create: `lib/ward/gate.ts` — `assertMonitoringConsent(avatarId)` (server, service role).
- Modify: `package.json` — devDependency `vitest` + script `test`.
- Create: `vitest.config.ts` — config minimale.

Confini: `consent.ts` e' pura (testabile da sola); `audit.ts` e `gate.ts` fanno IO (service role); nessun file front-end in questo piano.

---

## Task 0: Branch + test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Creare il branch**

Run:
```bash
git -C "F:/human2ai-passport" checkout -b ward-module1
```
Expected: `Switched to a new branch 'ward-module1'`

- [ ] **Step 2: Aggiungere vitest (dev) e lo script test**

In `package.json`, dentro `"scripts"` aggiungere la riga `"test": "vitest run",` e dentro `"devDependencies"` aggiungere `"vitest": "^3.2.4",`. Risultato atteso dei due blocchi:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "start:railway": "node worker/start-prod.mjs",
    "test": "vitest run"
  },
```
```json
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/leaflet": "^1.9.21",
    "@types/node": "^20",
    "@types/qrcode": "^1.5.6",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/three": "^0.184.1",
    "ffmpeg-static": "^5.3.0",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^3.2.4"
  }
```

- [ ] **Step 3: Creare `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

// Test di sola logica pura (niente DOM, niente Next). I file *.test.ts vivono
// accanto al codice che testano (es. lib/ward/consent.test.ts).
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Installare**

Run:
```bash
npm install
```
Expected: vitest aggiunto, nessun errore.

- [ ] **Step 5: Commit**

```bash
git -C "F:/human2ai-passport" add package.json package-lock.json vitest.config.ts
git -C "F:/human2ai-passport" commit -m "Ward Module 1: setup vitest per la logica pura"
```

---

## Task 1: Schema dati Ward (tabelle)

**Files:**
- Create: `supabase/ward_module1.sql`
- DB: applicare via `apply_migration` (nome migrazione: `ward_module1_tables`).

- [ ] **Step 1: Scrivere il DDL in `supabase/ward_module1.sql`**

```sql
-- WARD Module 1 — schema dati (additivo, idempotente).
-- Riusa avatars/profiles (D6: niente protected_persons). Niente pgvector (D5).
-- Le scritture passano dal service role; gli utenti leggono solo le proprie righe (RLS in ward_module1_rls.sql).

-- Consenso di MONITORAGGIO (distinto dall'Art.9 di non-generazione gia' in consent_events).
create table if not exists monitoring_consents (
  id            uuid primary key default gen_random_uuid(),
  avatar_id     uuid not null references avatars(id) on delete cascade,
  scope         text not null default 'open_web',
  on_match      text not null default 'notify' check (on_match in ('notify','auto')),
  open_web      boolean not null default true,
  consent_doc_path text,
  granted_at    timestamptz not null default now(),
  expires_at    timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists monitoring_consents_avatar_idx on monitoring_consents(avatar_id);

-- Job di scansione (orchestrazione nel worker, piano successivo).
create table if not exists scan_jobs (
  id          uuid primary key default gen_random_uuid(),
  avatar_id   uuid not null references avatars(id) on delete cascade,
  status      text not null default 'queued' check (status in ('queued','running','done','error')),
  provider    text,
  stats       jsonb not null default '{}'::jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);
create index if not exists scan_jobs_avatar_idx on scan_jobs(avatar_id);

-- Candidati TRANSITORI: cancellati dopo il processing (data-minimization A2.3).
create table if not exists scan_candidates (
  id          uuid primary key default gen_random_uuid(),
  scan_job_id uuid not null references scan_jobs(id) on delete cascade,
  source_url  text not null,
  phash       text,
  status      text not null default 'pending',
  created_at  timestamptz not null default now()
);
create index if not exists scan_candidates_job_idx on scan_candidates(scan_job_id);

-- Match confermati/da-rivedere (mai i sotto-soglia).
create table if not exists scan_matches (
  id          uuid primary key default gen_random_uuid(),
  avatar_id   uuid not null references avatars(id) on delete cascade,
  scan_job_id uuid references scan_jobs(id) on delete set null,
  source_url  text not null,
  host        text,
  score       integer,
  band        text not null check (band in ('confirmed','review')),
  ai_verdict  text,
  sensitivity text not null default 'standard' check (sensitivity in ('standard','sensitive','minor')),
  phash       text,
  content_anchor text,
  created_at  timestamptz not null default now()
);
create index if not exists scan_matches_avatar_idx on scan_matches(avatar_id);

-- Evidenze (file nel bucket privato ward-evidence; qui i riferimenti).
create table if not exists evidence_records (
  id              uuid primary key default gen_random_uuid(),
  scan_match_id   uuid not null references scan_matches(id) on delete cascade,
  screenshot_path text,
  html_path       text,
  whois           jsonb,
  hash            text,
  anchored_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists evidence_records_match_idx on evidence_records(scan_match_id);

-- Fonti autorizzate per-avatar (allowlist: "questo uso e' lecito").
create table if not exists allowlist (
  id         uuid primary key default gen_random_uuid(),
  avatar_id  uuid not null references avatars(id) on delete cascade,
  host       text not null,
  reason     text,
  created_at timestamptz not null default now()
);
create index if not exists allowlist_avatar_idx on allowlist(avatar_id);

-- Azioni Nemesis (documenti DMCA / GDPR Art.17).
create table if not exists nemesis_actions (
  id            uuid primary key default gen_random_uuid(),
  scan_match_id uuid not null references scan_matches(id) on delete cascade,
  kind          text not null check (kind in ('dmca','gdpr17')),
  artifact_path text,
  status        text not null default 'drafted' check (status in ('drafted','sent','host_pending','removed','legal','escalated')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists nemesis_actions_match_idx on nemesis_actions(scan_match_id);

-- Audit log append-only (ogni scan, cambio consenso, decisione, azione).
create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      uuid,
  action     text not null,
  target     text,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log(created_at);
```

- [ ] **Step 2: Applicare la migrazione (Claude, via MCP)**

Mostrare l'SQL sopra a Morelz, poi `apply_migration` con `name: "ward_module1_tables"` e il body identico al file.

- [ ] **Step 3: Verificare lo schema a terra**

Con `list_tables` (schema public) confermare le 8 nuove tabelle. Poi:
```sql
select table_name, count(*) as cols
from information_schema.columns
where table_schema='public'
  and table_name in ('monitoring_consents','scan_jobs','scan_candidates','scan_matches','evidence_records','allowlist','nemesis_actions','audit_log')
group by table_name order by table_name;
```
Expected: 8 righe, con i conteggi colonne attesi (es. monitoring_consents=10, audit_log=5).

- [ ] **Step 4: Commit**

```bash
git -C "F:/human2ai-passport" add supabase/ward_module1.sql
git -C "F:/human2ai-passport" commit -m "Ward Module 1: schema dati (8 tabelle additive)"
```

---

## Task 2: RLS owner-scoped

**Files:**
- Create: `supabase/ward_module1_rls.sql`
- DB: applicare via `apply_migration` (nome: `ward_module1_rls`).

- [ ] **Step 1: Scrivere le policy in `supabase/ward_module1_rls.sql`**

```sql
-- WARD Module 1 — RLS. Service role bypassa SEMPRE (worker/server).
-- Owner-scoped: l'utente legge solo le righe dei propri avatar.
-- Interne/transitorie (scan_candidates, audit_log): RLS ON senza policy = lock totale
-- agli authenticated/anon (solo service role), stato sano voluto.

-- Helper: gli avatar dell'utente corrente.
-- (inline nelle policy: avatar_id in (select id from avatars where owner_id = auth.uid()))

alter table monitoring_consents enable row level security;
create policy "owner reads own monitoring_consents" on monitoring_consents
  for select using (avatar_id in (select id from avatars where owner_id = auth.uid()));

alter table scan_jobs enable row level security;
create policy "owner reads own scan_jobs" on scan_jobs
  for select using (avatar_id in (select id from avatars where owner_id = auth.uid()));

alter table scan_matches enable row level security;
create policy "owner reads own scan_matches" on scan_matches
  for select using (avatar_id in (select id from avatars where owner_id = auth.uid()));

alter table allowlist enable row level security;
create policy "owner reads own allowlist" on allowlist
  for select using (avatar_id in (select id from avatars where owner_id = auth.uid()));

-- Evidence e Nemesis: owner via il match collegato.
alter table evidence_records enable row level security;
create policy "owner reads own evidence" on evidence_records
  for select using (scan_match_id in (
    select m.id from scan_matches m
    join avatars a on a.id = m.avatar_id
    where a.owner_id = auth.uid()));

alter table nemesis_actions enable row level security;
create policy "owner reads own nemesis_actions" on nemesis_actions
  for select using (scan_match_id in (
    select m.id from scan_matches m
    join avatars a on a.id = m.avatar_id
    where a.owner_id = auth.uid()));

-- Interne: RLS ON, nessuna policy (deny by default; solo service role).
alter table scan_candidates enable row level security;
alter table audit_log enable row level security;
```

- [ ] **Step 2: Applicare (Claude, via MCP)**

`apply_migration` con `name: "ward_module1_rls"`.

- [ ] **Step 3: Verificare RLS dal vivo (impersonazione, come l'Onda 2A)**

Inserire un consenso di prova su un avatar reale e provare lettura cross-utente:
```sql
-- prepara: un avatar reale e il suo owner
select id, owner_id, handle from avatars where owner_id is not null limit 1;
```
Poi, impersonando l'OWNER e un ALTRO utente (sostituendo gli UUID):
```sql
-- come owner: deve vedere 1 (dopo aver inserito un consenso via service role)
insert into monitoring_consents(avatar_id) values ('<AVATAR_ID>');
set local role authenticated;
set local request.jwt.claims to '{"sub":"<OWNER_UUID>"}';
select count(*) from monitoring_consents where avatar_id = '<AVATAR_ID>'; -- atteso 1
reset role;
-- come NON owner: deve vedere 0
set local role authenticated;
set local request.jwt.claims to '{"sub":"<ALTRO_UUID>"}';
select count(*) from monitoring_consents where avatar_id = '<AVATAR_ID>'; -- atteso 0
reset role;
```
Poi `get_advisors` (security): le tabelle utente NON devono restare `rls_enabled_no_policy`; `scan_candidates`/`audit_log` SI' (stato sano).

- [ ] **Step 4: Commit**

```bash
git -C "F:/human2ai-passport" add supabase/ward_module1_rls.sql
git -C "F:/human2ai-passport" commit -m "Ward Module 1: RLS owner-scoped (+ lock interne)"
```

---

## Task 3: Helper audit log

**Files:**
- Create: `lib/ward/audit.ts`

- [ ] **Step 1: Scrivere `lib/ward/audit.ts`**

```ts
import { createServerClient } from "@/lib/supabase";

// Audit log append-only di Ward. Best-effort: l'audit non deve MAI bloccare
// l'azione che descrive (se l'insert fallisce, l'operazione prosegue). Solo
// service role scrive (la tabella e' lockata agli utenti, vedi RLS).
export interface AuditEntry {
  actor: string | null;        // uuid utente o null (azione di sistema/worker)
  action: string;              // es. "scan.consent_ok", "scan.consent_denied"
  target: string | null;       // es. avatar_id o match_id
  meta?: Record<string, unknown>;
}

export async function appendAudit(entry: AuditEntry): Promise<void> {
  const admin = createServerClient();
  try {
    await admin.from("audit_log").insert({
      actor: entry.actor,
      action: entry.action,
      target: entry.target,
      meta: entry.meta ?? {},
    });
  } catch {
    /* best-effort: l'audit non blocca mai l'azione */
  }
}
```

- [ ] **Step 2: Verifica a terra (scrittura)**

In una sessione Node temporanea NON serve: la verifica vera avviene in Task 5 (il gate scrive audit). Qui basta il typecheck:

Run:
```bash
npx tsc --noEmit
```
Expected: nessun errore su `lib/ward/audit.ts`.

- [ ] **Step 3: Commit**

```bash
git -C "F:/human2ai-passport" add lib/ward/audit.ts
git -C "F:/human2ai-passport" commit -m "Ward Module 1: helper audit log append-only"
```

---

## Task 4: Logica PURA di validita' del consenso (TDD)

**Files:**
- Create: `lib/ward/consent.ts`
- Test: `lib/ward/consent.test.ts`

- [ ] **Step 1: Scrivere il test che fallisce, `lib/ward/consent.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { monitoringConsentStatus, type MonitoringConsentRow } from "./consent";

const NOW = "2026-06-19T12:00:00.000Z";
const base: MonitoringConsentRow = {
  scope: "open_web", on_match: "notify", open_web: true,
  granted_at: "2026-06-01T00:00:00.000Z", expires_at: null, revoked_at: null,
};

describe("monitoringConsentStatus", () => {
  it("null o senza granted_at -> none", () => {
    expect(monitoringConsentStatus(null, NOW)).toBe("none");
    expect(monitoringConsentStatus({ ...base, granted_at: null }, NOW)).toBe("none");
  });
  it("revocato -> revoked (anche se non scaduto)", () => {
    expect(monitoringConsentStatus({ ...base, revoked_at: "2026-06-10T00:00:00.000Z" }, NOW)).toBe("revoked");
  });
  it("scaduto -> expired", () => {
    expect(monitoringConsentStatus({ ...base, expires_at: "2026-06-18T00:00:00.000Z" }, NOW)).toBe("expired");
  });
  it("scadenza esattamente ora -> expired (confine incluso)", () => {
    expect(monitoringConsentStatus({ ...base, expires_at: NOW }, NOW)).toBe("expired");
  });
  it("attivo senza scadenza -> active", () => {
    expect(monitoringConsentStatus(base, NOW)).toBe("active");
  });
  it("attivo con scadenza futura -> active", () => {
    expect(monitoringConsentStatus({ ...base, expires_at: "2026-12-31T00:00:00.000Z" }, NOW)).toBe("active");
  });
  it("revoca ha priorita' sulla scadenza", () => {
    expect(monitoringConsentStatus({ ...base, expires_at: "2099-01-01T00:00:00.000Z", revoked_at: "2026-06-05T00:00:00.000Z" }, NOW)).toBe("revoked");
  });
});
```

- [ ] **Step 2: Eseguire il test, deve FALLIRE**

Run:
```bash
npm test
```
Expected: FAIL, "Cannot find module './consent'" (o export mancante).

- [ ] **Step 3: Implementare `lib/ward/consent.ts`**

```ts
// Validita' del consenso di MONITORAGGIO. Funzione PURA (nessun IO, nessun Date.now
// interno: il "now" si passa), cosi e' testabile e deterministica. Regola del brief
// (A2.1): nessuno scan senza consenso attivo, non scaduto e non revocato.

export interface MonitoringConsentRow {
  scope: string | null;
  on_match: string | null;
  open_web: boolean | null;
  granted_at: string | null;   // ISO
  expires_at: string | null;   // ISO o null = nessuna scadenza
  revoked_at: string | null;   // ISO o null = non revocato
}

export type ConsentStatus = "active" | "none" | "revoked" | "expired";

// Precedenza: none -> revoked -> expired -> active. Il confine di scadenza e'
// INCLUSO (expires_at <= now significa gia' scaduto): in dubbio, NON si scansiona.
export function monitoringConsentStatus(
  consent: MonitoringConsentRow | null,
  nowIso: string,
): ConsentStatus {
  if (!consent || !consent.granted_at) return "none";
  if (consent.revoked_at) return "revoked";
  if (consent.expires_at && consent.expires_at <= nowIso) return "expired";
  return "active";
}
```

- [ ] **Step 4: Eseguire il test, deve PASSARE**

Run:
```bash
npm test
```
Expected: PASS, 7 test verdi.

- [ ] **Step 5: Commit**

```bash
git -C "F:/human2ai-passport" add lib/ward/consent.ts lib/ward/consent.test.ts
git -C "F:/human2ai-passport" commit -m "Ward Module 1: logica pura validita' consenso + test"
```

---

## Task 5: Il consent gate `assertMonitoringConsent`

**Files:**
- Create: `lib/ward/gate.ts`

- [ ] **Step 1: Scrivere `lib/ward/gate.ts`**

```ts
import { createServerClient } from "@/lib/supabase";
import { monitoringConsentStatus } from "./consent";
import { appendAudit } from "./audit";

// IL GATE (brief A2.1): nessuna discovery/match parte se l'avatar non ha un
// consenso di monitoraggio ATTIVO. Server-only (service role). Logga SEMPRE
// l'esito nell'audit. Nessun bypass flag. Prende l'ultimo consenso per avatar.
export type GateResult =
  | { ok: true; consentId: string; onMatch: "notify" | "auto" }
  | { ok: false; status: "none" | "revoked" | "expired"; reason: string };

export async function assertMonitoringConsent(avatarId: string): Promise<GateResult> {
  const admin = createServerClient();
  const { data } = await admin
    .from("monitoring_consents")
    .select("id, scope, on_match, open_web, granted_at, expires_at, revoked_at")
    .eq("avatar_id", avatarId)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = monitoringConsentStatus(data ?? null, new Date().toISOString());

  if (status !== "active") {
    await appendAudit({ actor: null, action: "scan.consent_denied", target: avatarId, meta: { status } });
    return { ok: false, status, reason: `Monitoraggio non consentito (${status})` };
  }

  await appendAudit({ actor: null, action: "scan.consent_ok", target: avatarId, meta: { consentId: data!.id } });
  return { ok: true, consentId: data!.id, onMatch: (data!.on_match as "notify" | "auto") };
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: nessun errore.

- [ ] **Step 3: Verifica a terra del gate (integrazione DB)**

Verifica la QUERY che il gate usa (ultimo consenso + esito), con dati reali via `execute_sql`. Su un `<AVATAR_ID>` di prova:
```sql
-- nessun consenso -> il gate vedra' "none"
delete from monitoring_consents where avatar_id = '<AVATAR_ID>';
select (select count(*) from monitoring_consents where avatar_id='<AVATAR_ID>') as n; -- atteso 0
-- consenso attivo -> "active"
insert into monitoring_consents(avatar_id, on_match) values ('<AVATAR_ID>','auto');
select on_match, granted_at, expires_at, revoked_at
from monitoring_consents where avatar_id='<AVATAR_ID>'
order by granted_at desc limit 1; -- atteso: auto, granted recente, expires null, revoked null
-- revocato -> "revoked"
update monitoring_consents set revoked_at = now() where avatar_id='<AVATAR_ID>';
-- pulizia
delete from monitoring_consents where avatar_id='<AVATAR_ID>';
```
Dopo che esistera' un consenso attivo, una chiamata reale al gate (nel piano scan) dovra' lasciare in `audit_log` una riga `scan.consent_ok`; con consenso assente/revocato, una riga `scan.consent_denied`. Verifica futura:
```sql
select action, target, meta, created_at from audit_log order by created_at desc limit 5;
```

- [ ] **Step 4: Commit**

```bash
git -C "F:/human2ai-passport" add lib/ward/gate.ts
git -C "F:/human2ai-passport" commit -m "Ward Module 1: consent gate assertMonitoringConsent + audit"
```

---

## Self-review (fatto in fase di scrittura)
- **Copertura spec:** sez. 3.1 (tabelle) = Task 1; 3.4 consent gate + audit = Task 4-5 + Task 3; RLS owner-scoped (D6) = Task 2; D5 (niente pgvector) = rispettato (nessun vector). Discovery/scan/UI/Nemesis = piani successivi (fuori scope, dichiarato).
- **Placeholder:** nessuno; ogni step ha SQL/TS/comando reale.
- **Coerenza tipi:** `MonitoringConsentRow`/`ConsentStatus` definiti in Task 4 e usati identici in Task 5; `assertMonitoringConsent` ritorna `GateResult`; `appendAudit`/`AuditEntry` (Task 3) usati in Task 5 con le stesse chiavi.

## Cosa NON e' in questo piano (piani successivi della Slice 1)
- Piano 2: primitivo embed/match server-side (face-api nel worker) + `DiscoveryProvider` (stub + Google Vision).
- Piano 3: orchestratore scan (`scan_jobs` -> candidati -> match) con i delete di data-minimization + evidence capture (Playwright).
- Piano 4: UI Ward (`/ward`: Radar + Detections + Detail coi 3 comportamenti) + Nemesis (documenti DMCA/GDPR).
