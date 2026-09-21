# Ward Protected-Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, with checkpoints) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ricostruire ALLA LETTERA il funnel di protezione Ward da homepage, come da `SEMBLIC_WARD_DEFINITIVO.md` (+ 6 mockup HTML in `C:/Users/morel/Downloads/HTML WARD/`): home CTA -> `/ward` entry a 3 pannelli -> `/ward/demo` + `/signup/avatar` (KYC -> fork Aperto|Protetto) -> `/signup/avatar/protected` (foto volto -> consenso Ward -> attivo) + `?existing=1`, con `AvatarHolderGate` a 3 stati.

**Architecture:** Si RIUSA tutto il motore + tool + DB Ward gia' costruiti (lib/ward/*, WardApp + 4 tab, 8 tabelle + RLS). Si COSTRUISCE solo lo strato di ingresso/onboarding mancante. Il tool resta su `/ward` ma dietro un `AvatarHolderGate` a 3 stati (locked -> 3 pannelli, demo -> demo, full -> tool). Il flusso protetto riusa la cattura volto + `/api/veto/register` (crea l'avatar `protection_only` + faceprint 128-d) e AGGIUNGE l'attivazione Ward (`monitoring_consents`).

**Tech Stack:** Next.js 16 App Router + TS, Tailwind v4 (token Semblic in `app/globals.css`), ward.css (token Ward + Space Grotesk/JetBrains Mono), Supabase (anon client per auth, service-role per scritture), vitest (test puri), `@vladmandic/face-api` (descrittori 128-d on-device, gia' in uso).

**Decisioni bloccate (utente, 2026-06-20):** (1) /ward = Gate su /ward (non split). (2) KYC = STUB ora (UI completa, salva solo `profiles.kyc_status='approved'`; Didit reale dopo). (3) /proteggi = redirect a `/signup/avatar/protected` + riuso della cattura volto.

**Data-model (chiuso):** protetto/aperto via `avatars.protection_only` (NO `avatars.type`); stato monitoraggio derivato da `monitoring_consents` (riuso `lib/ward/consent.ts`); **nessuna migrazione**. Pagine/flussi LETTERALI come da MD.

**Regole progetto:** niente trattini lunghi nei testi; commenti in italiano; commit italiano + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; NO push (solo a "pubblica"); design-last (struttura ora, polish estetico alla fine, ma le pagine Ward usano gia' i token dei mockup).

---

## File Structure

**Create:**
- `lib/ward/entitlement.ts` — funzione PURA `wardGateState()` (full|demo|locked).
- `lib/ward/entitlement.test.ts` — test puri del gate.
- `lib/ward/entitlement-server.ts` — `loadWardEntitlement(userId|null)`: stato + (se full) WardData.
- `lib/ward/ward-consent.ts` — helper PURO `buildMonitoringConsent()` (durata -> expires_at, scope, on_match).
- `lib/ward/ward-consent.test.ts` — test puri dell'helper consenso.
- `app/ward/WardEntry.tsx` — i 3 pannelli (Provala / Hai gia un avatar / Proteggiti ora).
- `app/ward/demo/page.tsx` — demo: WardApp in modalita demo.
- `app/signup/SignupDoors.tsx` — chooser 3 porte (Creator / Avatar / Enterprise).
- `app/signup/avatar/page.tsx` — entry avatar: KYC stub -> fork Aperto|Protetto; gestisce `?existing=1`.
- `app/signup/avatar/AvatarFlow.tsx` — client stepper dell'entry avatar (KYC + fork + consenso-only per existing).
- `app/signup/avatar/protected/page.tsx` — flusso protetto.
- `app/signup/avatar/protected/ProtectedFlow.tsx` — client stepper (KYC -> foto volto -> consenso Ward -> attivo).
- `app/signup/avatar/layout.tsx` — wrapper Ward (font + `.ward-app`) per coerenza visiva col mockup entry-journey.
- `app/signup/avatar/face-capture.tsx` — cattura foto volto estratta/riusata da ProteggiClient (PickBox + pose + descriptorForFile + shrink).
- `app/api/ward/activate/route.ts` — inserisce `monitoring_consents` per l'avatar protetto dell'utente + audit.
- `app/api/kyc/stub/route.ts` — STUB KYC: setta `profiles.kyc_status='approved'` per l'utente loggato.

**Modify:**
- `components/marketing/WardSection.tsx` — CTA "Scopri Ward" -> `/ward`.
- `components/marketing/Navbar.tsx` — CTA primaria "Proteggiti" -> `/signup/avatar`; voce menu "Ward" href `/#ward` -> `/ward`.
- `app/ward/WardApp.tsx` — tab "Detections" -> "Trovati"; aggiungere prop `demo` (badge + filigrana + scan finta + CTA d'uscita).
- `app/ward/page.tsx` — togliere redirect login; render per stato del gate (locked/demo/full).
- `app/ward/ward.css` — stili `.ward-entry` (3 pannelli) + `.ward-demo-badge`/`.ward-demo-wm` (badge+filigrana) + CTA uscita demo.
- `app/signup/page.tsx` — mostra `SignupDoors` (3 porte) invece del solo form; niente redirect ciclico.
- `app/proteggi/page.tsx` — redirect 308 a `/signup/avatar/protected`.

---

## Task 1: Fix presentazionali (home CTA, header CTA, label tab)

**Files:**
- Modify: `components/marketing/WardSection.tsx:30`
- Modify: `components/marketing/Navbar.tsx` (NAV "Ward" item + blocco CTA desktop)
- Modify: `app/ward/WardApp.tsx:114`

- [ ] **Step 1: WardSection CTA**
  `app/.../WardSection.tsx`: cambiare `<Link href="/proteggi">Blinda la tua faccia</Link>` in `<Link href="/ward">Scopri Ward</Link>`. Aggiornare il commento del file (non punta piu a /proteggi). Copy da spec PARTE I.

- [ ] **Step 2: Navbar — voce Ward + CTA Proteggiti**
  In `NAV`, item Ward: `{ href: "/#ward", label: "Ward" }` -> `{ href: "/ward", label: "Ward" }`. Nel blocco desktop a destra (riga ~140) aggiungere PRIMA del/accanto al bottone "Verifica" una CTA primaria: `<Button asChild size="sm"><Link href="/signup/avatar">Proteggiti</Link></Button>` (amber pieno), e declassare "Verifica" a `variant="outline"`. Drawer mobile: aggiungere "Proteggiti" -> `/signup/avatar` come CTA primaria in fondo (sopra/insieme a "Verifica un contenuto").

- [ ] **Step 3: Label tab Trovati**
  `WardApp.tsx:114`: `label="Detections"` -> `label="Trovati"` (spec D/J: etichette corte IT, niente a-capo).

- [ ] **Step 4: Verifica a terra**
  Dev :3000 vivo. Caricare home in iframe 375px e desktop: misurare che `#ward` esista, CTA testo "Scopri Ward" e href `/ward`; header desktop ha link "Proteggiti" -> `/signup/avatar`; nessun overflow orizzontale. (QA per misura, non screenshot: preview headless congela le animazioni.)

- [ ] **Step 5: Commit**
  `git add -A && git commit` messaggio: `Ward home/header: CTA "Scopri Ward" -> /ward e "Proteggiti" -> /signup/avatar; tab Trovati`.

---

## Task 2: AvatarHolderGate, logica pura (TDD)

**Files:**
- Create: `lib/ward/entitlement.ts`
- Test: `lib/ward/entitlement.test.ts`

- [ ] **Step 1: Test che fallisce** (`lib/ward/entitlement.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { wardGateState } from "./entitlement";

describe("wardGateState", () => {
  it("non loggato -> locked", () => {
    expect(wardGateState({ loggedIn: false, hasAvatar: false, monitoring: "none" })).toBe("locked");
    expect(wardGateState({ loggedIn: false, hasAvatar: true, monitoring: "active" })).toBe("locked");
  });
  it("loggato senza avatar -> locked", () => {
    expect(wardGateState({ loggedIn: true, hasAvatar: false, monitoring: "none" })).toBe("locked");
  });
  it("avatar ma monitoraggio non attivo -> demo", () => {
    for (const m of ["none", "revoked", "expired"] as const)
      expect(wardGateState({ loggedIn: true, hasAvatar: true, monitoring: m })).toBe("demo");
  });
  it("avatar + monitoraggio attivo -> full", () => {
    expect(wardGateState({ loggedIn: true, hasAvatar: true, monitoring: "active" })).toBe("full");
  });
});
```

- [ ] **Step 2: Run -> FAIL** `npx vitest run lib/ward/entitlement.test.ts` (modulo inesistente).

- [ ] **Step 3: Implementazione** (`lib/ward/entitlement.ts`)

```ts
import type { ConsentStatus } from "./consent";

// Stato del cancello Ward (spec B3). PURA. locked = nessun avatar o non loggato;
// demo = ha avatar ma monitoraggio non attivo; full = avatar + monitoraggio attivo.
export type WardGateState = "full" | "demo" | "locked";

export function wardGateState(p: {
  loggedIn: boolean;
  hasAvatar: boolean;
  monitoring: ConsentStatus;
}): WardGateState {
  if (!p.loggedIn || !p.hasAvatar) return "locked";
  return p.monitoring === "active" ? "full" : "demo";
}
```

- [ ] **Step 4: Run -> PASS** `npx vitest run lib/ward/entitlement.test.ts`.
- [ ] **Step 5: Commit** `Ward: wardGateState (gate 3 stati full/demo/locked) con test`.

---

## Task 3: Loader entitlement server

**Files:**
- Create: `lib/ward/entitlement-server.ts`

- [ ] **Step 1: Implementazione**
  `loadWardEntitlement(userId: string | null)`:
  - se `userId` null -> `{ state: "locked" }`.
  - query `avatars` per `owner_id=userId` (preferendo `protection_only`), come in `load-server.ts`. Nessun avatar -> `{ state: "locked" }`.
  - leggere ultimo `monitoring_consents` dell'avatar -> `monitoringConsentStatus(row, now)`.
  - `state = wardGateState({ loggedIn: true, hasAvatar: true, monitoring })`.
  - se `full`: chiamare `loadWardData(userId)` e ritornare `{ state, avatarId, data }`. Altrimenti `{ state, avatarId }`.
  - Riusa `createServerClient`, `monitoringConsentStatus`, `loadWardData`, `wardGateState`. Server-only.

- [ ] **Step 2: Typecheck** `npx tsc --noEmit` (0 errori).
- [ ] **Step 3: Commit** `Ward: loadWardEntitlement (stato gate + WardData se full)`.

---

## Task 4: WardEntry (3 pannelli) + restructure /ward

**Files:**
- Create: `app/ward/WardEntry.tsx`
- Modify: `app/ward/page.tsx`, `app/ward/ward.css`

Riferimento visivo: spec PARTE H (codice `WardEntry`) + `ward-homepage-flow.html` (sezione ENTRY, 3 pannelli con icone). Copy PARTE I/C2.

- [ ] **Step 1: WardEntry.tsx** — 3 pannelli (desktop 3 col, mobile stack), token Ward:
  - Pannello "Provala" (ambra, badge DEMO) -> `/ward/demo`.
  - Pannello "Hai gia un avatar" (indigo/depth) -> `/signup/avatar?existing=1`.
  - Pannello "Proteggiti ora" (salvia, badge CONSIGLIATO, bordo+sfondo salvia) -> `/signup/avatar/protected`, con micro-lista (verifica KYC gratis / 3 foto del volto / consenso -> Ward attivo).
  - Intro: eyebrow "Proteggi il tuo volto", h1 "Tre modi per cominciare", lede da mockup. Stili in `.ward-entry` (ward.css).
- [ ] **Step 2: ward.css** — aggiungere `.ward-entry` (grid pannelli, badge, icone, hover) trascrivendo dal mockup.
- [ ] **Step 3: page.tsx** — togliere `redirect("/login")`; `createAuthClient().auth.getUser()` (puo essere null); `loadWardEntitlement(user?.id ?? null)`; render:
  - `locked` -> `<WardEntry />`.
  - `demo` -> `<WardApp data={DEMO_WARD} demo />` (CTA d'uscita -> /signup/avatar?existing=1).
  - `full` -> `<WardApp data={ent.data} scanAvatarId={ent.avatarId} />`.
  - Mantenere il flag `WARD_REAL_DATA` solo come override (se non "1" e stato full, fallback DEMO con dati reali identita): per semplicita, in full usare sempre i dati reali da entitlement; demo usa DEMO_WARD.
- [ ] **Step 4: Verifica a terra** — `/ward` da sloggato mostra i 3 pannelli (misura: 3 link con gli href giusti, niente redirect a /login); link corretti. Iframe 375 + desktop, 0 overflow.
- [ ] **Step 5: Commit** `Ward: /ward diventa entry a 3 pannelli dietro AvatarHolderGate (locked/demo/full)`.

---

## Task 5: /ward/demo + modalita demo del tool

**Files:**
- Modify: `app/ward/WardApp.tsx`, `app/ward/ward.css`
- Create: `app/ward/demo/page.tsx`

Riferimento: `ward-demo-full.html` (badge DEMO + fascia + filigrana diagonale, scan finta con toast, 1 CTA reale). Spec PARTE D.

- [ ] **Step 1: WardApp prop `demo`** — `demo?: boolean`. Se `demo`:
  - render badge DEMO persistente nel topbar + fascia "Anteprima simulata, dati casuali, i pulsanti non eseguono nulla di reale" + filigrana diagonale (`.ward-demo-wm`).
  - `handleScan` -> versione FINTA: anima la radar, poi `setScanMsg("Scansione completata: N contenuti analizzati, M nuovi ritrovamenti.")` (numeri pseudo da indice, niente fetch). Passare `onScan` finto al Radar.
  - rendere il bottone scan sempre attivo in demo.
  - aggiungere in fondo una sola CTA reale "Esci dalla demo e proteggiti davvero" -> `/signup/avatar/protected`.
- [ ] **Step 2: ward.css** — `.ward-demo-badge`, `.ward-demo-strip`, `.ward-demo-wm` (filigrana rotate -30deg, opacity ~0.05), `.ward-demo-exit`.
- [ ] **Step 3: demo/page.tsx** — `export default function WardDemoPage(){ return <WardApp data={DEMO_WARD} demo />; }`. Nessun auth, nessuna rete.
- [ ] **Step 4: Verifica a terra** — `/ward/demo` carica senza login; misura presenza badge/fascia/filigrana e CTA d'uscita -> /signup/avatar/protected; "Avvia scansione" mostra un messaggio finto; nessuna chiamata a /api/ward/scan (preview_network vuoto su scan).
- [ ] **Step 5: Commit** `Ward: /ward/demo, tool intero in modalita demo (badge + filigrana + scan finta + CTA)`.

---

## Task 6: /signup tre porte

**Files:**
- Create: `app/signup/SignupDoors.tsx`
- Modify: `app/signup/page.tsx`

Spec B2/J: l'iscrizione mostra ESATTAMENTE 3 porte (Creator / Avatar / Enterprise), mai una quarta. La porta Avatar -> `/signup/avatar`.

- [ ] **Step 1: SignupDoors.tsx** — 3 card: Creator -> `/signup/creator`, Avatar (consigliata, -> `/signup/avatar`), Enterprise -> `/signup/enterprise`. Copy chiaro su cosa fa ognuna (Creator = metti il volto e guadagni; Avatar = proteggi/usa il tuo volto; Enterprise = agenzia). Token Semblic globali.
- [ ] **Step 2: page.tsx** — rimuovere il redirect-a-/account: mostrare `SignupDoors` sia loggati che no (e' un portale di scelta, non "crea account", quindi niente loop). Il form account vero resta sotto le porte (Creator/Enterprise riusano l'attuale `SignupForm`/`/enterprise/register`).
- [ ] **Step 3: routes porte** — creare `app/signup/creator/page.tsx` (riusa `SignupForm` con default seller) e `app/signup/enterprise/page.tsx` (redirect a `/enterprise/register` o riusa form con intent enterprise). Minimo indispensabile per non avere 404 dalle porte.
- [ ] **Step 4: Verifica** — `/signup` mostra 3 porte; ogni porta naviga senza 404; loggato non vede "Crea account" in loop.
- [ ] **Step 5: Commit** `Signup: portale a 3 porte (Creator/Avatar/Enterprise); Avatar -> /signup/avatar`.

---

## Task 7: helper consenso Ward (TDD) + API attivazione + KYC stub

**Files:**
- Create: `lib/ward/ward-consent.ts`, `lib/ward/ward-consent.test.ts`
- Create: `app/api/ward/activate/route.ts`, `app/api/kyc/stub/route.ts`

- [ ] **Step 1: Test helper** (`ward-consent.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { buildMonitoringConsent } from "./ward-consent";

const NOW = "2026-06-20T00:00:00.000Z";
describe("buildMonitoringConsent", () => {
  it("durata 12m -> expires +12 mesi, scope/on_match passati", () => {
    const r = buildMonitoringConsent({ avatarId: "a1", onMatch: "notify", months: 12, nowIso: NOW });
    expect(r.avatar_id).toBe("a1");
    expect(r.scope).toBe("open_web");
    expect(r.on_match).toBe("notify");
    expect(r.open_web).toBe(true);
    expect(r.granted_at).toBe(NOW);
    expect(r.expires_at).toBe("2027-06-20T00:00:00.000Z");
    expect(r.revoked_at).toBeNull();
  });
  it("durata 6m -> expires +6 mesi", () => {
    expect(buildMonitoringConsent({ avatarId: "a1", onMatch: "auto", months: 6, nowIso: NOW }).expires_at)
      .toBe("2026-12-20T00:00:00.000Z");
  });
  it("on_match invalido -> notify", () => {
    expect(buildMonitoringConsent({ avatarId: "a1", onMatch: "x" as never, months: 12, nowIso: NOW }).on_match).toBe("notify");
  });
});
```

- [ ] **Step 2: Run -> FAIL**.
- [ ] **Step 3: Implementazione** (`ward-consent.ts`)

```ts
// Costruisce la riga monitoring_consents (spec F3). PURA: niente IO, now passato.
export interface MonitoringConsentInsert {
  avatar_id: string;
  scope: string;
  on_match: "notify" | "auto";
  open_web: boolean;
  granted_at: string;
  expires_at: string;
  revoked_at: null;
}
export function buildMonitoringConsent(p: {
  avatarId: string;
  onMatch: "notify" | "auto";
  months: number;
  nowIso: string;
}): MonitoringConsentInsert {
  const d = new Date(p.nowIso);
  d.setUTCMonth(d.getUTCMonth() + p.months);
  return {
    avatar_id: p.avatarId,
    scope: "open_web",
    on_match: p.onMatch === "auto" ? "auto" : "notify",
    open_web: true,
    granted_at: p.nowIso,
    expires_at: d.toISOString(),
    revoked_at: null,
  };
}
```

- [ ] **Step 4: Run -> PASS**.
- [ ] **Step 5: API `/api/ward/activate`** — POST `{ onMatch, months }`: auth (401 se no user); trova l'avatar `protection_only` dell'utente (409 se non esiste: serve prima la protezione); `buildMonitoringConsent`; insert in `monitoring_consents`; `appendAudit({ action: "ward.activate", target: avatarId })`. Ritorna `{ ok: true }`. Server (`createServerClient`).
- [ ] **Step 6: API `/api/kyc/stub`** — POST: auth; `update profiles set kyc_status='approved' where id=user.id`; audit `kyc.stub_approved`. Ritorna `{ ok: true }`. (Stub: Didit reale dopo.)
- [ ] **Step 7: Commit** `Ward: buildMonitoringConsent + /api/ward/activate + /api/kyc/stub (KYC stub)`.

---

## Task 8: cattura volto riusabile

**Files:**
- Create: `app/signup/avatar/face-capture.tsx`

- [ ] **Step 1: Estrarre da ProteggiClient** la logica di cattura volto in un componente `FaceCapture` riusabile: PickBox + griglia pose (`POSES`/`PoseGlyph`) + `shrinkForUpload` + calcolo `descriptorForFile`/`computeFaceMatch`, props: `onReady(payload)` dove payload = `{ front, back, selfie, photos, descriptors, faceMatch }` pronto per `/api/veto/register`. Solo il VISO (spec: fronte + 2-3 tre-quarti), niente documento+selfie obbligatori? -> lo spec Passo 3b dice "solo foto del viso"; pero' /api/veto/register esige document_front+selfie. Per non rompere il VETO: in questo flusso la KYC (Passo 1) copre l'identita; quindi il Passo foto invia document_front+selfie SOLO se richiesti dall'API. DECISIONE build-time: mantenere la cattura volto (pose) + un selfie come "front", e passare il selfie anche come document_front placeholder, OPPURE rilassare /api/veto/register per accettare la sola cattura volto quando kyc_status='approved'. Implementare rilassando l'API: se l'utente ha `kyc_status='approved'`, document_front/selfie non sono obbligatori (l'identita e' gia' verificata in KYC). Aggiornare `/api/veto/register` di conseguenza (guard: descriptors sempre obbligatori).
- [ ] **Step 2: Typecheck**. 
- [ ] **Step 3: Commit** `Ward: FaceCapture riusabile + /api/veto/register accetta KYC-verified senza documento`.

---

## Task 9: /signup/avatar (KYC stub + fork) + /signup/avatar/protected + existing

**Files:**
- Create: `app/signup/avatar/layout.tsx`, `app/signup/avatar/page.tsx`, `app/signup/avatar/AvatarFlow.tsx`, `app/signup/avatar/protected/page.tsx`, `app/signup/avatar/protected/ProtectedFlow.tsx`

Riferimento: `sentinel-entry-journey.html` (KYC liveness -> foto -> consenso -> attivo) + `ward-homepage-flow.html` (#protect stepper). Spec B2/E/F3.

- [ ] **Step 1: layout.tsx** — wrapper Ward (Space Grotesk + JetBrains Mono + `.ward-app`) come `app/ward/layout.tsx`, cosi il funnel e' coerente coi mockup.
- [ ] **Step 2: page.tsx (entry avatar)** — server: richiede login (se sloggato -> `/login?next=/signup/avatar`). Legge `?existing=1`. Passa a `<AvatarFlow existing={...} kycDone={profiles.kyc_status==='approved'} />`.
- [ ] **Step 3: AvatarFlow.tsx** — client stepper:
  - se `existing` -> salta a "consenso Ward" (consent-only): schermata consenso -> POST `/api/ward/activate` -> "Ward attivo" -> link `/ward`.
  - altrimenti: Passo 1 KYC (UI finta liveness/documento -> POST `/api/kyc/stub`) -> Passo 2 fork: card "Avatar aperto" (-> per ora `/signup/creator` o nota "presto", fuori PRIORITA 1) e "Identita protetta" (-> naviga a `/signup/avatar/protected`).
- [ ] **Step 4: protected/page.tsx** — server: login + `kycDone`. Render `<ProtectedFlow kycDone={...} />`.
- [ ] **Step 5: ProtectedFlow.tsx** — stepper:
  - Passo 1 KYC (se non fatto): UI -> `/api/kyc/stub`.
  - Passo 2 foto del volto: `<FaceCapture onReady={...} />` -> POST `/api/veto/register` (crea avatar `protection_only` + faceprint).
  - Passo 3 consenso Ward: scope (open_web), on-match (Notify/Auto), durata (6m/12m), "Protezione sensibili: sempre attiva" (lock), testo GDPR Art.9, checkbox consenso -> POST `/api/ward/activate`.
  - Passo 4 attivo: schermata "Ward e' attivo" -> link `/ward`.
- [ ] **Step 6: Verifica a terra** — col login test (`test-card-e3@h2ai.dev`): percorrere `/signup/avatar` -> KYC stub -> fork -> protected -> (cattura: in headless la webcam/upload non c'e', verificare per misura la presenza/ordine degli step + che gli endpoint rispondano 200/401 correttamente). `?existing=1` mostra direttamente il consenso. Verificare a DB che un giro completo crei `avatars.protection_only=true` + una riga `monitoring_consents` attiva (query di controllo, poi cleanup se e' l'avatar di test).
- [ ] **Step 7: Commit** `Ward: /signup/avatar (KYC stub + fork) + /signup/avatar/protected (foto -> consenso -> attivo) + ?existing=1`.

---

## Task 10: /proteggi redirect

**Files:**
- Modify: `app/proteggi/page.tsx`

- [ ] **Step 1:** sostituire il corpo con `redirect("/signup/avatar/protected")` (permanente). Rimuovere/non usare `ProteggiClient` dalla pagina (lasciare il file: la logica di cattura e' stata riusata in `FaceCapture`). Aggiornare il commento: /proteggi e' un alias storico, il flusso vero e' /signup/avatar/protected.
- [ ] **Step 2: Verifica** — GET `/proteggi` redirige a `/signup/avatar/protected`.
- [ ] **Step 3: Commit** `Proteggi: redirect a /signup/avatar/protected (flusso protetto unico, spec)`.

---

## Task 11: Verifica funnel + review

- [ ] **Step 1: tsc + test** — `npx tsc --noEmit` (0 errori) e `npm test` (tutti verdi, inclusi i nuovi entitlement/ward-consent).
- [ ] **Step 2: Verifica funnel end-to-end a terra** (per misura, iframe 375 + desktop): home -> "Scopri Ward" -> `/ward` (3 pannelli da sloggato) -> "Provala" -> `/ward/demo` (badge+filigrana+scan finta) e -> "Proteggiti ora" -> `/signup/avatar/protected`; header "Proteggiti" -> `/signup/avatar`; `/proteggi` redirige. 0 overflow, 0 errori console.
- [ ] **Step 3: Review** — confronto avversariale del funnel coi criteri di accettazione PARTE J (3 porte, /ward 3 pannelli, demo intera simulata, label corte, badge ancorato all'icona, existing solo consenso, protected KYC+foto+consenso, sicurezza consent-gate/minori/sensibili/audit, token + niente trattini lunghi).
- [ ] **Step 4: Commit finale** se restano fix.

---

## Self-Review (coverage vs spec)

- B1 header CTA Proteggiti -> Task 1. ✓
- B2 tre porte + /signup/avatar + fork -> Task 6, 9. ✓
- B3 gate 3 stati -> Task 2,3,4. ✓
- C1 home #ward -> /ward -> Task 1. ✓
- C2 /ward 3 pannelli -> Task 4. ✓
- D demo intera -> Task 5. ✓
- E bivio (protection_only) -> Task 9. ✓
- F2 KYC (stub) -> Task 7,9. ✓
- F3 iscrizione protetta + consenso -> Task 8,9. ✓ (monitoring_consents)
- I copy -> Task 1,4,5,9. ✓
- J criteri -> Task 11 review. ✓
- Engine/DB/tool (F4-F8) -> GIA' FATTI, riusati. ✓
- /proteggi rivisto -> Task 10. ✓

**Gap noti / fuori PRIORITA 1 (documentati, non bloccanti):** ramo "Avatar aperto" (8 foto licensing) resta stub; Didit reale; discovery LIVE (Vision); `registry` view; `monitoring_enabled` colonna (derivato). Restano fasi successive come da MD.
