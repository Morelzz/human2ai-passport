# Ward UI Shell + Radar Home, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far esistere e girare l'app Ward su `/ward` (mobile-first): route group con layout dedicato (font Ward + token Ward), guscio a 4 tab (Radar / Detections / Nemesis / Vault), e la home **Radar** (l'elemento firma) fedele al mockup, su dati DEMO.

**Architecture:** Route group `app/ward/` con il suo `layout.tsx` (carica Space Grotesk + JetBrains Mono via next/font, importa `ward.css` con i token Ward) fuori dalla chrome marketing. La pagina server fa il gate auth e passa dati demo a un client component `WardApp` che gestisce lo stato delle 4 tab (come il mockup, screen toggled). Nessun backend nuovo: tutto su `DEMO_WARD`. Lo scan reale si innesta dopo.

**Tech Stack:** Next 16 App Router, React 19, next/font/google, CSS (ward.css), TypeScript. Verifica nel preview browser.

**Riferimenti:** spec `docs/superpowers/specs/2026-06-19-ward-protected-avatars-design.md` (sez. 3.5, D7, D9); mockup `C:\Users\morel\Downloads\sentinel-mobile-v2.html` (FONTE del markup/CSS, da rinominare Sentinel -> Ward); token reali `app/globals.css` + `lib/ui.ts`.

**Branch:** continua su `ward-module1`. Commit locali; push solo a "pubblica". `npm`/`npx` dalla cartella `F:/human2ai-passport`; `git` con `-C`.

---

## Mappa dei file
- Create: `app/ward/layout.tsx` — route group: font Ward + import ward.css, no SiteNav.
- Create: `app/ward/ward.css` — token Ward (scoped `.ward-app`) + classi dei componenti (portate dal mockup).
- Create: `app/ward/page.tsx` — server component: gate auth, passa `DEMO_WARD` a `WardApp`.
- Create: `app/ward/demo.ts` — dati demo tipizzati (stato protezione, stats, blip, detections, ops, vault).
- Create: `app/ward/WardApp.tsx` — client: topbar + 4 screen + bottom nav (stato tab). Radar costruita; le altre 3 tab placeholder "in arrivo".
- Create: `app/ward/Radar.tsx` — la home Radar (radar + status + tri-stats + nem-strip + run scan).

Confini: `demo.ts` è solo dati (tipi esportati, riusati quando arriverà il dato reale); `WardApp` orchestra le tab; `Radar` è una schermata isolata. ward.css contiene SOLO stili Ward, scoped, niente impatto sul resto del sito.

---

## Tabella A — mappatura token mockup -> reali (da usare in ward.css)

| Var mockup | Valore reale Ward | Nota |
|---|---|---|
| `--obsidian #080910` | `--ward-bg: #0A0C12` | nero Ward leggermente più profondo del sito (#0C0F17), ammesso come superficie app |
| `--surface-1 #0E1019` | `--ward-s1: #0E1019` | card |
| `--surface-2 #141826` | `--ward-s2: #141826` | superfici annidate |
| `--surface-3 #1B2032` | `--ward-s3: #1B2032` | chip rialzate (NET-NEW livello) |
| `--lumen #E9EEF8` | `var(--text)` (#F2E9D8) | testo: usa il Lumen reale del repo |
| `--muted #7E879C` | `--ward-muted: #8A93A6` | testo secondario |
| `--amber #F6B13C` | `var(--amber-c)` (#F2A93B) | azione: token reale |
| `--salvia #6FCB9F` | `var(--verified-c)` (#7FAE96) | safe/verificato: token reale |
| `--coral #FB6A5B` | `var(--blocked-c)` (#EE7A70) | non autorizzato: token reale |
| `--strike #FF5247` | `--ward-strike: #FF5247` | NET-NEW: Nemesis piena intensità |
| `--indigo #7B6CF6` | `--ward-indigo: #7B6CF6` | NET-NEW: identità/radar |
| `--teal #46C6D6` | `--ward-cyan: #46C6D6` | NET-NEW: identità/radar (depth) |
| `--grad-signal` | `--grad-tramonto` esistente | amber->coral, già nel repo |
| `--grad-depth` | `--ward-grad-depth: linear-gradient(150deg,#7B6CF6,#46C6D6)` | NET-NEW: core radar |
| `--grad-strike` | `--ward-grad-strike: linear-gradient(135deg,#FF5247,#9c1722)` | NET-NEW: Nemesis |

---

## Task 1: Route group + layout + token Ward + pagina gated (guscio vuoto)

**Files:**
- Create: `app/ward/ward.css`
- Create: `app/ward/layout.tsx`
- Create: `app/ward/demo.ts`
- Create: `app/ward/WardApp.tsx`
- Create: `app/ward/page.tsx`

- [ ] **Step 1: Creare `app/ward/ward.css`**

Portare il blocco `<style>` di `sentinel-mobile-v2.html` dentro questo file con QUESTE trasformazioni esatte:
1. Avvolgere tutto sotto lo scope `.ward-app` (prefissare ogni selettore con `.ward-app `, es. `.ward-app .topbar { ... }`). Il blocco `:root` del mockup diventa il blocco token qui sotto.
2. Sostituire i font: `'Space Grotesk'` -> `var(--font-ward-display)`, `'JetBrains Mono'` -> `var(--font-ward-mono)`, `'Inter'` -> `var(--font-geist-sans)`.
3. Sostituire i colori secondo la Tabella A (le var mockup diventano le var Ward/reali).
4. Rimuovere da `body{...}` del mockup tutto ciò che è globale (display:grid/place-items/min-height/padding): qui l'app vive dentro `.ward-app`, non sul body.

Il blocco token in testa al file (sostituisce il `:root` del mockup):
```css
.ward-app {
  /* superfici Ward */
  --ward-bg:#0A0C12; --ward-s1:#0E1019; --ward-s2:#141826; --ward-s3:#1B2032;
  --ward-line:rgba(180,196,224,.09); --ward-line-strong:rgba(180,196,224,.18);
  --ward-muted:#8A93A6; --ward-muted-dim:#525B70;
  /* NET-NEW Ward (gli altri colori arrivano dai token globali del repo) */
  --ward-strike:#FF5247; --ward-indigo:#7B6CF6; --ward-cyan:#46C6D6;
  --ward-grad-depth:linear-gradient(150deg,#7B6CF6,#46C6D6);
  --ward-grad-strike:linear-gradient(135deg,#FF5247,#9c1722);

  position:relative; width:100%; min-height:100dvh;
  background:var(--ward-bg); color:var(--text);
  font-family:var(--font-geist-sans),system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
}
/* Su desktop l'app resta una colonna mobile centrata (max 480px). */
.ward-app .ward-frame{ max-width:480px; margin:0 auto; min-height:100dvh; position:relative;
  display:flex; flex-direction:column; }
@media (prefers-reduced-motion:reduce){ .ward-app .sweep,.ward-app .spin{animation:none} }
```
(Le classi `.topbar .radar .ring .sweep .core .blip .tri .nem-strip .btn .tabbar .tab` ecc. arrivano dal mockup, prefissate `.ward-app`.)

- [ ] **Step 2: Creare `app/ward/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./ward.css";

// Firma tipografica Ward (D9): display + mono dedicati, SOLO sulle route /ward.
const wardDisplay = Space_Grotesk({ variable: "--font-ward-display", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const wardMono = JetBrains_Mono({ variable: "--font-ward-mono", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Ward",
  robots: { index: false, follow: false }, // app privata, fuori dall'indice
};

export default function WardLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${wardDisplay.variable} ${wardMono.variable} ward-app`}>{children}</div>;
}
```

- [ ] **Step 3: Creare `app/ward/demo.ts`**

```ts
// Dati DEMO della app Ward. I TIPI sono la fonte: quando arriva il dato reale
// (scan engine), si sostituisce solo la sorgente, non i componenti.
export interface WardBlip { x: number; y: number; sev: "c" | "a" | "s"; }
export interface WardDetection { id: string; dom: string; score: number; band: "confirmed" | "review"; meta: string; }
export interface WardOp { id: string; dom: string; meta: string; status: "pending" | "removed" | "legal"; }
export interface WardEvidence { id: string; dom: string; score: number; hash: string; anchoredAt: string; tags: string[]; }

export interface WardData {
  identity: { handle: string; consent: "active" | "expired" | "revoked"; coreId: string };
  status: "protected" | "at_risk";
  lastSweep: string;
  nextScan: string;
  stats: { confirmed: number; review: number; cleared: number };
  blips: WardBlip[];
  nemesis: { landed: number; inProgress: number; escalated: number };
  detections: WardDetection[];
  ops: WardOp[];
  vault: WardEvidence[];
}

export const DEMO_WARD: WardData = {
  identity: { handle: "Ward-003", consent: "active", coreId: "0xA7F3" },
  status: "protected",
  lastSweep: "2 min fa",
  nextScan: "tra 6 h",
  stats: { confirmed: 3, review: 2, cleared: 209 },
  blips: [
    { x: 72, y: 32, sev: "c" }, { x: 60, y: 68, sev: "c" }, { x: 34, y: 42, sev: "c" },
    { x: 50, y: 24, sev: "a" }, { x: 30, y: 60, sev: "a" },
    { x: 78, y: 54, sev: "s" }, { x: 44, y: 78, sev: "s" }, { x: 24, y: 48, sev: "s" },
  ],
  nemesis: { landed: 14, inProgress: 3, escalated: 1 },
  detections: [
    { id: "d1", dom: "unknown-host.ru", score: 94, band: "confirmed", meta: "AI-generated - nessun consenso" },
    { id: "d2", dom: "repost-board.net", score: 89, band: "confirmed", meta: "originale rubato" },
    { id: "d3", dom: "mirror-cdn.io", score: 86, band: "confirmed", meta: "AI-generated" },
    { id: "d4", dom: "ad-network.io", score: 58, band: "review", meta: "possibile - volto parziale" },
  ],
  ops: [
    { id: "o1", dom: "leak-forum.cc", meta: "DMCA + GDPR inviati - 3 giorni fa", status: "pending" },
    { id: "o2", dom: "deepfake-host.to", meta: "controdeduzione - con legale", status: "legal" },
    { id: "o3", dom: "old-blog.net", meta: "contenuto rimosso - 1 settimana fa", status: "removed" },
  ],
  vault: [
    { id: "v1", dom: "unknown-host.ru", score: 94, hash: "0x9f3c...a71e", anchoredAt: "2026-06-19", tags: ["screenshot", "html snapshot", "WHOIS", "AI-flag"] },
    { id: "v2", dom: "repost-board.net", score: 89, hash: "0x2b80...f44c", anchoredAt: "2026-06-19", tags: ["screenshot", "html snapshot", "WHOIS"] },
  ],
};
```

- [ ] **Step 4: Creare `app/ward/WardApp.tsx` (guscio: topbar + bottom nav + screen placeholder)**

```tsx
"use client";
import { useState } from "react";
import type { WardData } from "./demo";
import { Radar } from "./Radar";

type Tab = "radar" | "detections" | "nemesis" | "vault";

export function WardApp({ data }: { data: WardData }) {
  const [tab, setTab] = useState<Tab>("radar");
  return (
    <div className="ward-frame">
      <header className="topbar">
        <div className="tmark">S</div>
        <div className="twrap"><div className="eb">SEMBLIC</div><div className="nm">Ward</div></div>
        <div className="id-chip"><span className="o" /><span>{data.identity.handle}</span><span className="cdot" /></div>
      </header>

      <main className="body">
        {tab === "radar" && <Radar data={data} />}
        {tab === "detections" && <Placeholder title="Detections" />}
        {tab === "nemesis" && <Placeholder title="Nemesis" />}
        {tab === "vault" && <Placeholder title="Vault" />}
      </main>

      <nav className="tabbar">
        <TabBtn id="radar" cur={tab} set={setTab} label="Radar" />
        <TabBtn id="detections" cur={tab} set={setTab} label="Detections" />
        <TabBtn id="nemesis" cur={tab} set={setTab} label="Nemesis" nem badge={data.nemesis.inProgress} />
        <TabBtn id="vault" cur={tab} set={setTab} label="Vault" />
      </nav>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <section className="screen on" style={{ padding: "40px 16px" }}>
      <div className="h-row"><h2>{title}</h2></div>
      <p style={{ fontFamily: "var(--font-ward-mono)", fontSize: 12, color: "var(--ward-muted)" }}>In arrivo nella prossima fase.</p>
    </section>
  );
}

function TabBtn({ id, cur, set, label, nem, badge }: {
  id: Tab; cur: Tab; set: (t: Tab) => void; label: string; nem?: boolean; badge?: number;
}) {
  const on = cur === id;
  return (
    <button className={`tab${on ? " on" : ""}${nem ? " nemtab" : ""}`} onClick={() => set(id)}>
      <span className="lb">{label}</span>
      {nem && badge ? <span className="badge show">{badge}</span> : null}
    </button>
  );
}
```
NB: per ora i tab usano solo l'etichetta `.lb` (niente SVG icone), per non bloccare il guscio. Le icone si aggiungono nel piano UI successivo portandole dal mockup.

- [ ] **Step 5: Creare `app/ward/page.tsx` (server, gate auth)**

```tsx
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { WardApp } from "./WardApp";
import { DEMO_WARD } from "./demo";

// App Ward (protezione). Per ora gate solo su login; il legame con l'avatar
// protetto reale e i dati veri arrivano con lo scan engine. Dati DEMO.
export default async function WardPage() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <WardApp data={DEMO_WARD} />;
}
```

- [ ] **Step 6: Stub di `Radar` per far compilare il guscio**

Creare `app/ward/Radar.tsx` minimale (verra' completato in Task 2):
```tsx
import type { WardData } from "./demo";
export function Radar({ data }: { data: WardData }) {
  return <section className="screen on"><div className="h-row"><h2>Radar</h2></div><p>{data.status}</p></section>;
}
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: nessun errore sui file `app/ward/*`.

- [ ] **Step 8: Commit**

```bash
git -C "F:/human2ai-passport" add app/ward/
git -C "F:/human2ai-passport" commit -m "Ward UI: guscio /ward (route, layout font+token, 4 tab, gate auth) su dati demo" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: La home Radar (elemento firma)

**Files:**
- Modify: `app/ward/Radar.tsx` (sostituisce lo stub)

- [ ] **Step 1: Implementare `app/ward/Radar.tsx`**

Portare il markup della sezione `<section class="screen on" id="s-radar">` del mockup `sentinel-mobile-v2.html` in JSX, con questi adattamenti:
- `class=` -> `className=`; gli `style="left:..;top:.."` dei blip diventano `style={{ left: ..., top: ... }}` mappati da `data.blips`.
- I numeri della tri-stat e i testi vengono da `data.stats`, `data.lastSweep`, `data.nextScan`, `data.nemesis`, `data.identity.coreId`.
- Etichette in italiano: "Protetto", "monitoraggio attivo", "Confermati/Da rivedere/Cancellati".

```tsx
import type { WardData } from "./demo";

export function Radar({ data }: { data: WardData }) {
  const { stats, blips, nemesis, identity, lastSweep, nextScan } = data;
  return (
    <section className="screen on" id="s-radar">
      <div className="h-row"><h2>Radar</h2><span className="sub">ultima scansione {lastSweep}</span></div>

      <div className="radar">
        <div className="ring" /><div className="ring r2" /><div className="ring r3" /><div className="ring r4" />
        <div className="cross" /><div className="sweep" />
        <div className="core"><span>{identity.coreId}</span></div>
        {blips.map((b, i) => (
          <div key={i} className={`blip ${b.sev}`} style={{ left: `${b.x}%`, top: `${b.y}%` }} />
        ))}
      </div>

      <div className="status-line">
        <div className="b"><span className="d" /> Protetto</div>
        <div className="s">monitoraggio attivo - prossima scansione {nextScan}</div>
      </div>

      <div className="tri">
        <div className="m"><div className="n c">{stats.confirmed}</div><div className="k">Confermati</div></div>
        <div className="m"><div className="n a">{stats.review}</div><div className="k">Da rivedere</div></div>
        <div className="m"><div className="n s">{stats.cleared}</div><div className="k">Cancellati</div></div>
      </div>

      <div className="nem-strip">
        <div className="nmk" aria-hidden />
        <div className="ns-txt">
          <div className="t">NEMESIS</div>
          <div className="m">{nemesis.landed} takedown andati a segno - {nemesis.inProgress} in corso</div>
        </div>
      </div>

      <button className="btn"><span>Avvia scansione</span></button>
    </section>
  );
}
```
NB: gli SVG (icona scudo nella nem-strip, lente nel bottone) si possono aggiungere dal mockup; per ora il `.nmk` è un blocco col gradiente strike (basta lo stile). Lo `Run scan` è inerte in demo (lo scan reale arriva dopo).

- [ ] **Step 2: Verificare che ward.css contenga le classi radar**

Confermare che in `app/ward/ward.css` (Task 1) siano presenti, portate dal mockup e prefissate `.ward-app`: `.radar .ring .ring.r2/.r3/.r4 .cross .sweep @keyframes spin .core .blip .blip.c/.a/.s .status-line .tri .nem-strip .btn`. Se una manca, aggiungerla dal mockup.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
git -C "F:/human2ai-passport" add app/ward/Radar.tsx app/ward/ward.css
git -C "F:/human2ai-passport" commit -m "Ward UI: home Radar (radar firma + stats + presenza Nemesis) su dati demo" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Verifica nel browser (e' qui che si VEDE Ward)

**Files:** nessuno (verifica).

- [ ] **Step 1: Avviare il preview**

`preview_start` (script "dev"); confermare HTTP su localhost:3000.

- [ ] **Step 2: Loggarsi e aprire /ward**

`/ward` richiede login. Usare la sessione di test gia' nota; navigare a `localhost:3000/ward`.

- [ ] **Step 3: Verificare il LAYOUT per misura (non per screenshot)**

Per la memoria [[preview-headless-raf-frozen]] lo sweep del radar e' un'animazione infinita -> lo screenshot puo' andare in timeout e le animazioni sono congelate. Verificare quindi:
- `preview_snapshot` per struttura/testo (le 4 tab, "Radar", "Protetto", le tre stat, "NEMESIS").
- iframe 375px + `getBoundingClientRect`/`scrollWidth` per: zero overflow orizzontale; la tabbar in fondo; il radar quadrato centrato; i tap-target >= 40px.
- `preview_console_logs` per errori (font, hydration).

- [ ] **Step 4: Screenshot (best-effort)**

Provare `preview_screenshot`. Se va in timeout per lo sweep, NON e' un bug: documentarlo e affidarsi alle misure dello Step 3. In alternativa, prima dello scatto, fermare lo sweep via `preview_eval` (`document.querySelector('.sweep').style.animation='none'`) e poi scattare.

- [ ] **Step 5: Se tutto verde, riportare a Morelz** con lo screenshot (o le misure) come prova.

---

## Self-review (in fase di scrittura)
- **Copertura:** route+layout+font+token (Task 1) = spec sez. 3.5 + D9; Radar firma (Task 2) = sez. 3.5/B4; gate auth = pattern repo; demo data tipizzato = riuso futuro. Detections/Nemesis/Vault/Detail (3 comportamenti) + overlay strike = ESPLICITAMENTE nel piano UI successivo, non qui.
- **Placeholder:** i tre tab non-radar mostrano uno stato "in arrivo" VOLUTO (guscio); non e' un placeholder di piano (il codice c'e' tutto).
- **Tipi:** `WardData` e i suoi sotto-tipi definiti in `demo.ts` (Task 1) e usati identici in `WardApp` e `Radar`.

## Non in questo piano (piano UI successivo)
- Tab Detections (lista + select-to-act + selection bar), Nemesis ops room, Vault.
- Detection detail coi 3 comportamenti (standard / sensibile-sfocato + StopNCII / minore-locked + NCMEC).
- Overlay strike Nemesis (briefing -> cancel 4s -> sequenza) + icone SVG dei tab.
- Innesto dei dati reali (sostituire DEMO_WARD con query allo scan engine).
