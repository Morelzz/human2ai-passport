# Nemesis (rimozione DMCA assistita) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Dare a una copia confermata in Ward v2 un bottone "Avvia rimozione" che prepara una DMCA notice (PDF lato client) e traccia lo stato bozza/inviata/rimossa, senza mai inviare in automatico.

**Architecture:** Core puro testabile in `lib/ward/takedown.ts` (notice + macchina a stati + classify recheck); repo Supabase in `lib/ward/takedown-repo.ts`; tabella nuova `takedown_profile` (migrazione gated); 3 route con ownership = buyer della generazione; PDF client con jsPDF; UI additiva su `ContentFinder` + nuovo `Takedown.tsx`.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (service role), vitest, jsPDF.

Spec: `docs/superpowers/specs/2026-06-28-nemesis-takedown-dmca-design.md`.

---

## File Structure
- Create `lib/ward/takedown.ts` — core puro (buildDmcaNotice, nextTakedownStatus, classifyRecheck) + tipi.
- Create `lib/ward/takedown.test.ts` — test del core.
- Create `lib/ward/takedown-repo.ts` — impl Supabase (profilo + azioni).
- Create `app/api/ward/takedown-profile/route.ts` — GET/POST profilo.
- Create `app/api/ward/takedown/route.ts` — POST crea bozza + notice.
- Create `app/api/ward/takedown/status/route.ts` — POST send/recheck.
- Create `app/ward/dmca-pdf.ts` — PDF client (jsPDF dynamic import).
- Create `app/ward/Takedown.tsx` — pannello a gradini.
- Modify `app/ward/ContentFinder.tsx` — bottone "Avvia rimozione" sulle confirmed + phash/alias/verifyUrl nel match.
- Migration gated `takedown_profile`.

---

### Task 1: Core puro (takedown.ts) — TDD

**Files:** Create `lib/ward/takedown.ts`, Test `lib/ward/takedown.test.ts`

- [ ] **Step 1: Test** — `lib/ward/takedown.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildDmcaNotice, nextTakedownStatus, classifyRecheck } from "./takedown";

const base = {
  claimant: { fullName: "Mario Rossi", address: "Via Roma 1, Milano", email: "m@x.it" },
  copy: { pageUrl: "https://bad.ru/p", sourceUrl: "https://bad.ru/i.jpg", host: "bad.ru" },
  work: { alias: "Ritratto A", certificate: "cert-1", verifyUrl: "https://semblic.com/v/cert-1", phash: "abcd", generatedAt: "2026-06-01" },
  abuse: { domain: "bad.ru", registrar: "RegX", source: "rdap" as const },
};

describe("buildDmcaNotice", () => {
  it("compone la notice coi dati e gli statement obbligatori", () => {
    const n = buildDmcaNotice(base);
    expect(n.infringingUrl).toBe("https://bad.ru/p");
    expect(n.claimant.fullName).toBe("Mario Rossi");
    expect(n.body).toContain("https://bad.ru/p");
    expect(n.body).toContain("https://semblic.com/v/cert-1");
    expect(n.body).toContain("Mario Rossi");
    expect(n.body.toLowerCase()).toContain("good faith");
    expect(n.body.toLowerCase()).toContain("perjury");
  });
  it("usa sourceUrl come infringingUrl se manca pageUrl", () => {
    const n = buildDmcaNotice({ ...base, copy: { ...base.copy, pageUrl: null } });
    expect(n.infringingUrl).toBe("https://bad.ru/i.jpg");
  });
});

describe("nextTakedownStatus", () => {
  it("drafted+send -> sent", () => expect(nextTakedownStatus("drafted", "send")).toBe("sent"));
  it("sent+recheck-gone -> removed", () => expect(nextTakedownStatus("sent", "recheck-gone")).toBe("removed"));
  it("sent+recheck-online -> online", () => expect(nextTakedownStatus("sent", "recheck-online")).toBe("online"));
  it("online+recheck-gone -> removed", () => expect(nextTakedownStatus("online", "recheck-gone")).toBe("removed"));
  it("transizione invalida lancia", () => expect(() => nextTakedownStatus("drafted", "recheck-gone")).toThrow());
});

describe("classifyRecheck", () => {
  it("404/410/null = gone", () => {
    expect(classifyRecheck(404)).toBe("gone");
    expect(classifyRecheck(410)).toBe("gone");
    expect(classifyRecheck(null)).toBe("gone");
  });
  it("200 = online", () => expect(classifyRecheck(200)).toBe("online"));
  it("status incerto = online (prudente)", () => expect(classifyRecheck(500)).toBe("online"));
});
```

- [ ] **Step 2:** `npm test -- takedown` → FAIL (modulo assente).

- [ ] **Step 3: Implementa** `lib/ward/takedown.ts`:

```ts
import type { WhoisSummary } from "./evidence/whois";

export type TakedownStatus = "drafted" | "sent" | "removed" | "online";
export type TakedownEvent = "send" | "recheck-gone" | "recheck-online";

export interface DmcaInput {
  claimant: { fullName: string; address: string; email: string };
  copy: { pageUrl: string | null; sourceUrl: string; host: string | null };
  work: { alias: string; certificate: string | null; verifyUrl: string | null; phash: string | null; generatedAt: string | null };
  abuse: Pick<WhoisSummary, "domain" | "registrar" | "source"> | null;
}

export interface DmcaNotice {
  to: string;
  subject: string;
  body: string;
  claimant: DmcaInput["claimant"];
  infringingUrl: string;
  originalWork: DmcaInput["work"];
}

// Notice DMCA in inglese (standard per gli host internazionali). Una sola fonte di
// verita' del testo: la usano sia l'anteprima UI sia il PDF.
export function buildDmcaNotice(input: DmcaInput): DmcaNotice {
  const infringingUrl = input.copy.pageUrl || input.copy.sourceUrl;
  const to = input.abuse?.domain ? `abuse@${input.abuse.domain}` : "(abuse contact non disponibile)";
  const subject = `DMCA Takedown Notice - ${input.copy.host ?? infringingUrl}`;
  const lines = [
    "DMCA TAKEDOWN NOTICE",
    "",
    `To: ${to}` + (input.abuse?.registrar ? ` (registrar: ${input.abuse.registrar})` : ""),
    "",
    "I am the owner of the copyrighted work described below, and I have a good faith",
    "belief that the use of the material in the manner complained of is not authorized",
    "by me, my agent, or the law.",
    "",
    "1. Copyrighted work:",
    `   Title: ${input.work.alias}`,
    input.work.certificate ? `   Authenticity certificate: ${input.work.certificate}` : "",
    input.work.verifyUrl ? `   Verify: ${input.work.verifyUrl}` : "",
    input.work.phash ? `   Perceptual hash: ${input.work.phash}` : "",
    input.work.generatedAt ? `   Created on: ${input.work.generatedAt}` : "",
    "",
    "2. Infringing material to be removed:",
    `   ${infringingUrl}`,
    input.copy.host ? `   Host: ${input.copy.host}` : "",
    "",
    "3. My contact information:",
    `   ${input.claimant.fullName}`,
    `   ${input.claimant.address}`,
    `   ${input.claimant.email}`,
    "",
    "I swear, under penalty of perjury, that the information in this notification is",
    "accurate and that I am the copyright owner or am authorized to act on behalf of",
    "the owner of an exclusive right that is allegedly infringed.",
    "",
    `Signature: ${input.claimant.fullName}`,
  ];
  const body = lines.filter((l) => l !== "").join("\n").replace(/\n(?=[1-3]\.)/g, "\n\n");
  return { to, subject, body, claimant: input.claimant, infringingUrl, originalWork: input.work };
}

export function nextTakedownStatus(current: TakedownStatus, event: TakedownEvent): TakedownStatus {
  if (current === "drafted" && event === "send") return "sent";
  if ((current === "sent" || current === "online") && event === "recheck-gone") return "removed";
  if ((current === "sent" || current === "online") && event === "recheck-online") return "online";
  throw new Error(`transizione non valida: ${current} + ${event}`);
}

// 404/410/irraggiungibile = la copia non c'e' piu'. Tutto il resto = prudenza, resta online.
export function classifyRecheck(httpStatus: number | null): "gone" | "online" {
  if (httpStatus === null || httpStatus === 404 || httpStatus === 410) return "gone";
  return "online";
}
```

- [ ] **Step 4:** `npm test -- takedown` → PASS. Poi `tsc --noEmit` → 0.
- [ ] **Step 5: Commit** `feat(nemesis): core puro DMCA notice + stato takedown`.

---

### Task 2: Migrazione `takedown_profile` (GATED) + repo

**Files:** Migration; Create `lib/ward/takedown-repo.ts`

- [ ] **Step 1: SQL migrazione** (applicare SOLO su "applica", mostrare prima):

```sql
create table if not exists public.takedown_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  full_name text not null,
  address text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.takedown_profile enable row level security;
create policy "takedown_profile owner select" on public.takedown_profile for select using (user_id = auth.uid());
create policy "takedown_profile owner insert" on public.takedown_profile for insert with check (user_id = auth.uid());
create policy "takedown_profile owner update" on public.takedown_profile for update using (user_id = auth.uid());
```

- [ ] **Step 2: Implementa** `lib/ward/takedown-repo.ts`:

```ts
import { createServerClient } from "@/lib/supabase";
import type { TakedownStatus } from "./takedown";

export interface TakedownProfile { fullName: string; address: string; email: string; }

export async function getProfile(userId: string): Promise<TakedownProfile | null> {
  const admin = createServerClient();
  const { data } = await admin.from("takedown_profile").select("full_name, address, email").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return { fullName: data.full_name as string, address: data.address as string, email: data.email as string };
}

export async function upsertProfile(userId: string, p: TakedownProfile): Promise<void> {
  const admin = createServerClient();
  const { error } = await admin.from("takedown_profile").upsert(
    { user_id: userId, full_name: p.fullName, address: p.address, email: p.email, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`upsertProfile: ${error.message}`);
}

export async function createAction(scanMatchId: string): Promise<{ id: string; status: TakedownStatus }> {
  const admin = createServerClient();
  const { data, error } = await admin.from("nemesis_actions")
    .insert({ scan_match_id: scanMatchId, kind: "dmca", status: "drafted" }).select("id, status").single();
  if (error) throw new Error(`createAction: ${error.message}`);
  return { id: data.id as string, status: data.status as TakedownStatus };
}

export async function getAction(actionId: string): Promise<{ id: string; scanMatchId: string; status: TakedownStatus } | null> {
  const admin = createServerClient();
  const { data } = await admin.from("nemesis_actions").select("id, scan_match_id, status").eq("id", actionId).maybeSingle();
  if (!data) return null;
  return { id: data.id as string, scanMatchId: data.scan_match_id as string, status: data.status as TakedownStatus };
}

export async function updateActionStatus(actionId: string, status: TakedownStatus): Promise<void> {
  const admin = createServerClient();
  const { error } = await admin.from("nemesis_actions").update({ status, updated_at: new Date().toISOString() }).eq("id", actionId);
  if (error) throw new Error(`updateActionStatus: ${error.message}`);
}
```

- [ ] **Step 3:** `tsc --noEmit` → 0. Commit `feat(nemesis): tabella takedown_profile + repo` (la migrazione si applica a "applica").

---

### Task 3: Route

**Files:** Create i 3 route. Pattern ownership = buyer (vedi `app/api/ward/content-scan/route.ts`).

- [ ] **Step 1:** Helper di ownership condiviso: aggiungi in `lib/ward/takedown-repo.ts`:

```ts
// Risolve il buyer (proprietario Ward v2) di un match: match -> job -> generation.
export async function matchOwner(scanMatchId: string): Promise<{
  buyerId: string; band: string; sensitivity: string; host: string | null; sourceUrl: string; pageUrl: string | null;
  certificate: string | null; phash: string | null; generationId: string; alias: string | null; generatedAt: string | null;
} | null> {
  const admin = createServerClient();
  const { data: m } = await admin.from("scan_matches")
    .select("id, band, sensitivity, host, source_url, page_url, certificate, phash, scan_job_id").eq("id", scanMatchId).maybeSingle();
  if (!m || !m.scan_job_id) return null;
  const { data: job } = await admin.from("scan_jobs").select("generation_id").eq("id", m.scan_job_id).maybeSingle();
  if (!job?.generation_id) return null;
  const { data: gen } = await admin.from("generations").select("id, buyer_id, alias, created_at").eq("id", job.generation_id).maybeSingle();
  if (!gen) return null;
  return {
    buyerId: gen.buyer_id as string, band: m.band as string, sensitivity: (m.sensitivity as string) ?? "standard",
    host: m.host as string | null, sourceUrl: m.source_url as string, pageUrl: m.page_url as string | null,
    certificate: m.certificate as string | null, phash: m.phash as string | null,
    generationId: gen.id as string, alias: (gen.alias as string | null), generatedAt: (gen.created_at as string | null),
  };
}
```
(Verifica i nomi colonna reali di `generations` con execute_sql: `alias` e `created_at`. Se `alias` non esiste, usa il campo display reale.)

- [ ] **Step 2:** `app/api/ward/takedown-profile/route.ts` — GET ritorna `{ profile }`; POST valida (campi non vuoti, email con `@`) + `upsertProfile` + rate-limit `ward-takedown-profile:${user.id}`.

- [ ] **Step 3:** `app/api/ward/takedown/route.ts` — POST `{ matchId }`: auth; `matchOwner`; `buyerId === user.id` else 404; `sensitivity==='minor'` -> 403; `band!=='confirmed'` -> 422; `getProfile` null -> 409 `{ needsProfile: true }`; `rdapLookup(host)`; `createAction`; `buildDmcaNotice({ claimant: profile, copy, work: { alias, certificate, verifyUrl: siteUrl()+'/v/'+certificate, phash, generatedAt }, abuse })`; ritorna `{ ok, actionId, status, notice }`. `verifyUrl` solo se c'e' certificate.

- [ ] **Step 4:** `app/api/ward/takedown/status/route.ts` — POST `{ actionId, event }` (`send|recheck`): `getAction`; `matchOwner(action.scanMatchId)` buyer check; `send` -> `nextTakedownStatus(status,'send')`; `recheck` -> fetch best-effort dell'URL (`pageUrl||sourceUrl`) con timeout, `classifyRecheck` -> `recheck-gone|recheck-online` -> `nextTakedownStatus`; `updateActionStatus`; ritorna `{ ok, status }`.

- [ ] **Step 5:** `tsc --noEmit` → 0. Commit `feat(nemesis): route takedown (profilo, bozza+notice, send/recheck)`.

---

### Task 4: PDF client + jsPDF

**Files:** `npm install jspdf`; Create `app/ward/dmca-pdf.ts`

- [ ] **Step 1:** `npm install jspdf`.
- [ ] **Step 2:** `app/ward/dmca-pdf.ts`:

```ts
import type { DmcaNotice } from "@/lib/ward/takedown";

export async function downloadDmcaPdf(notice: DmcaNotice, host: string | null) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48; let y = margin;
  doc.setFontSize(16); doc.text("Semblic", margin, y); y += 8;
  doc.setFontSize(9); doc.setTextColor(120); doc.text("Richiesta di rimozione assistita", margin, y + 8); y += 28;
  doc.setTextColor(20); doc.setFontSize(10);
  for (const line of notice.body.split("\n")) {
    const wrapped = doc.splitTextToSize(line, 515 - margin);
    if (y > 760) { doc.addPage(); y = margin; }
    doc.text(wrapped, margin, y); y += wrapped.length * 13 + 2;
  }
  doc.setFontSize(8); doc.setTextColor(140);
  doc.text("Questo documento non e' consulenza legale. Semblic prepara, l'invio spetta all'utente.", margin, 812);
  doc.save(`dmca-${(host ?? "copia").replace(/[^a-z0-9.]/gi, "_")}.pdf`);
}
```

- [ ] **Step 3:** `tsc --noEmit` → 0. Commit `feat(nemesis): PDF DMCA lato client (jsPDF)`.

---

### Task 5: UI — bottone + pannello Takedown

**Files:** Modify `app/ward/ContentFinder.tsx`; Create `app/ward/Takedown.tsx`

- [ ] **Step 1 (mockup-first):** mockup nel browser del pannello a gradini, OK di Morelz, poi codice.
- [ ] **Step 2:** `Takedown.tsx` client: props `{ matchId; host; onClose }`. Al mount POST `/api/ward/takedown`. 409 needsProfile -> step form (POST `/api/ward/takedown-profile`, poi ritenta). 200 -> step documento: mostra `notice.to`, `notice.body` (in `<pre>` con stile), bottone "Scarica PDF" (`downloadDmcaPdf`), disclaimer. Bottone "Ho inviato" -> POST status `send` -> step tracking. "Ricontrolla" -> POST status `recheck` -> badge `removed`(salvia)/`online`(coral).
- [ ] **Step 3:** `ContentFinder.tsx`: in `Card`, se `confirmed` aggiungi `<button>` Amber "Avvia rimozione" che apre `<Takedown>`. Stato `openTakedown: string|null` nel finder. `FinderMatch` ha gia' `id/host`: basta `m.id`,`m.host`.
- [ ] **Step 4:** Verifica preview (`preview_start "dev"`, NON 3000): bottone solo sulle confirmed, flusso profilo->documento->tracking, PDF scaricato. Mobile + desktop.
- [ ] **Step 5:** Commit `feat(nemesis): UI avvia rimozione + pannello a gradini`.

---

## Self-Review
- Spec coverage: profilo (T2/T3), notice (T1/T3), PDF (T4), tracking (T1/T3/T5), confirmed-only + minor + needsProfile (T3), disclaimer (T4/T5), migrazione gated (T2). OK.
- Tipi coerenti: `TakedownStatus`/`TakedownEvent`/`DmcaNotice` definiti in T1, usati identici in T2-T5.
- Da verificare a terra prima di T3: nomi colonna reali di `generations` (`buyer_id`, `alias`, `created_at`) e `scan_jobs.generation_id`.
