# Editor di post-produzione "Semblic Editor" (Parte B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere a SEMBLIC il "**Semblic Editor**" di post-produzione (Parte B della spec): una sezione dove l'utente rifinisce in modo NON distruttivo le proprie foto generate (preset, luce, colore, mixer HSL, curve, dettaglio, conversazionale) e le esporta (upscale + formato + provenienza), con resa finale server-side via `sharp`. **L'editor non si "aspetta" nel generatore** (la generazione e async): ci si arriva dalle proprie generazioni.

**Architecture:** L'editor e una **route dedicata** `app/studio/edit/[cert]/` che carica l'immagine di una generazione (per `certificate`, con check proprietario) + l'eventuale `edit_state` salvato, e monta un client component. Lo stato e un oggetto tipizzato puro (`lib/editor/`) condiviso client (anteprima live via CSS filter + layer + SVG feComponentTransfer) e server (resa finale via `sharp`). NON distruttivo: l'immagine pulita resta intatta, le modifiche sono `edit_state` (jsonb su `generations`).

**Due porte d'ingresso (PRIMARIE, in Fase 1), piu una scorciatoia:**
1. **`/account` -> "I miei contenuti":** su ogni foto generata, un **tasto grande "Modifica" SOPRA** Scarica e Condividi (Ricevuta di conformita resta) -> `/studio/edit/[cert]`.
2. **Menu di navigazione:** voce **"Semblic Editor" sotto "Genera"** -> landing `/studio/edit` (senza cert) = selettore: scegli una tua generazione (galleria), o in FUTURO carica un'immagine; selezionata -> `/studio/edit/[cert]`.
3. **Scorciatoia (non forzata):** alla fine di una generazione nello Studio, un CTA "Modifica" sul risultato (NIENTE redirect automatico: la generazione e async, la gente torna dopo).

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind + Supabase. Motore ECHO invariato. Resa server con `sharp` (oggi dipendenza solo transitiva: in Fase 3 va aggiunta come dependency ESPLICITA in package.json). Anteprima client con CSS filters / SVG (`feComponentTransfer`), nessuna libreria nuova lato client.

---

## Nota di fedelta UI (NON e un segnaposto)

La spec (`docs/SEMBLIC_STUDIO_EDITOR_BUILD_SPEC.md`, sezione 0) designa i prototipi HTML in `design/` come **fonte di verita per la UI**. Per i task UI il markup, le classi, le etichette e i comportamenti vanno **portati fedelmente** dai file design:

- `design/anteprima_editor_mobile.html` (editor, mobile, **CANONICO**): immagine FISSA in alto, parametri sotto in accordion uno-alla-volta, barra Esporta in fondo, sheet Esporta.
- `design/anteprima_editor_postproduzione.html` (editor, desktop): immagine a sinistra STICKY, pannello parametri a destra che scorre.

**ATTENZIONE (errore da non ripetere):** le DUE COLONNE valgono SOLO per il desktop dell'EDITOR. Il **Generatore** (`/match`, `StudioPanel`) resta a **UNA colonna** e non va toccato da questo piano (decisione esplicita di Morelz).

## Ambiente e verifica (questo progetto)

- Niente test runner per TypeScript: verifica = `npx tsc --noEmit`, `npm run build`, e controlli a runtime via preview MCP (`preview_start "dev"`, poi `preview_eval`/`preview_snapshot` su `localhost:3000`). Screenshot in timeout su pagine animate: misurare via `preview_eval` ([[preview-headless-raf-frozen]]).
- Login preview (seller): `test-card-e3@h2ai.dev` / `H2ai-test-2026!` (native-setter + `form.requestSubmit`). Serve un `certificate` di una generazione del seller (ne esiste gia almeno una reale dall'E2E; in mancanza generare).
- Migrazioni: le applico io con `apply_migration` (Morelz: "applica sempre tu"), SQL prima + verifica `execute_sql` dopo ([[connectors-mcp]]).
- Commit in italiano, niente trattini lunghi, trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Push SOLO a "pubblica". Lavoro su master, commit locali.

## File Structure

- **Create** `lib/editor/types.ts` — `EditState` (forma spec sezione 6), default, cataloghi puri: `PRESETS` (12), `LIGHT`/`COLOR`/`DETAIL`, `HSL_COLORS` (8).
- **Create** `lib/editor/preview.ts` — `composeFilter(state)`: porta di `apply()` del prototipo, ritorna `filter` CSS + opacita vig/grain.
- **Create** `lib/editor/curves.ts` (Fase 2) — eval multi-punto + `tableValues` per `feComponentTransfer`.
- **Create** `app/studio/edit/[cert]/page.tsx` — server: auth + carica generazione per `certificate` (owner check), passa image URL + meta + `edit_state`.
- **Create** `app/studio/edit/[cert]/EditorClient.tsx` — client dell'editor (mobile accordion / desktop 2 colonne).
- **Create** `app/studio/edit/[cert]/parts/` — `ImageStage`, `PresetStrip`, `SliderSection`, `HslMixer` (F2), `CurveEditor` (F2), `ExportSheet` (F3), `AskBar` (F4).
- **Create** `app/studio/edit/page.tsx` — **landing "Semblic Editor"** (menu, senza cert): galleria delle proprie generazioni da scegliere (upload immagine = TODO futuro), ognuna linka a `/studio/edit/[cert]`.
- **Modify** componente lista contenuti di `/account` ("I miei contenuti") — **tasto grande "Modifica" sopra Scarica/Condividi** -> `/studio/edit/[cert]`.
- **Modify** la **Navbar** (struttura `NAV`) — voce **"Semblic Editor" sotto "Genera"** -> `/studio/edit`.
- **Modify** `app/match/MatchClient.tsx` — sul risultato di generazione, CTA "Modifica" -> `/studio/edit/[cert]` (no redirect forzato).
- **Create** `app/api/edit/render/route.ts` (Fase 3) — resa finale server con `sharp`.
- **Create** `app/api/edit/interpret/route.ts` (Fase 4) — NL -> delta parametri (Claude API) + fallback keyword.
- **Create** `app/api/edit/save/route.ts` (Fase 3) — persiste `edit_state` (owner check).
- **Create** `supabase/editor_state_fields.sql` (Fase 3) — colonne additive `edit_state jsonb`, `upscale text`, `export_format text`.

## Modello dati (additivo, spec sezione 6)

Le 6 colonne fotografiche sono GIA applicate. Restano (Fase 3): `edit_state jsonb`, `upscale text`, `export_format text` su `generations`. Forma `edit_state` (spec 6): `{ preset, intensity, grain, light{exp,con,hi,sha,wh,bl}, color{temp,tint,vib,sat}, detail{sharp,clar,tex,haze,vig,grain}, hsl{hue{8},sat{8},lum{8}}, curves{rgb,r,g,b} }`.

---

# PANORAMICA FASI (build incrementale, conferma a ogni fase)

Morelz: un solo piano, costruito a fasi con sua conferma, **editor usabile prima**. Ogni fase e visibile/testabile e si ferma per conferma.

- **Fase 1 (dettagliata sotto):** l'editor (`/studio/edit/[cert]`) con **Preset + intensita, Luce, Colore**, anteprima live, tieni-premuto-originale, reset; layout mobile (accordion) + desktop (2 colonne). **+ le porte d'ingresso:** tasto "Modifica" in `/account`, voce "Semblic Editor" nel menu con landing/galleria, CTA "Modifica" sul risultato dello Studio. Export = riusa il download esistente con provenienza (l'immagine ESPORTATA resta l'originale finche non arriva la resa server, Fase 3: dichiarato nella UI).
- **Fase 2:** **Mixer HSL** (3 settori x 8 colori) + **Curve** multi-punto (4 canali, `feComponentTransfer`) + **Dettaglio ed effetti** (nitidezza, chiarezza, texture, foschia, vignettatura, grana, con layer `vig`/`grain` reali).
- **Fase 3:** **Sheet Esporta** (upscale 2K/4K, formati piattaforma) + **resa server con `sharp`** (`/api/edit/render`): l'export scarica l'immagine MODIFICATA, con upscale, watermark e certificato. Migrazione `edit_state`/`upscale`/`export_format` + salvataggio non distruttivo (`/api/edit/save`).
- **Fase 4:** **"Dimmi cosa cambiare"** (conversazionale): `/api/edit/interpret` (Claude API) -> delta parametri; fallback keyword.

> Ordine: F1 editor usabile + entry-point, poi HSL+Curve+Dettaglio, poi Esporta+resa server, poi conversazionale. Le Fasi 2-4 sono a livello di task: si espandono in step prima di eseguirle, dopo la conferma della fase precedente.

---

# FASE 1 — Editor usabile + porte d'ingresso (Preset, Luce, Colore)

### Task 1: `lib/editor/types.ts` + `lib/editor/preview.ts`

**Files:** Create `lib/editor/types.ts`, `lib/editor/preview.ts`.

- [ ] **Step 1:** `types.ts`: `PRESETS` (12, valori spec 4.3 / prototipo riga 259), `LIGHT`/`COLOR`/`DETAIL` (definizioni slider), `HSL_COLORS` (8), `EditState` (forma spec 6) + `defaultEditState()` (preset Naturale, intensity 0.85, slider 0, hsl 0, curve identita).
- [ ] **Step 2:** `preview.ts`: `composeFilter(state)` porta FEDELE di `apply()` (prototipo 302-314) ma in Fase 1 senza HSL/curve: preset scalato per intensita + luce + colore. Ritorna stringa filter + opacita vig/grain (0 in F1).
- [ ] **Step 3:** `npx tsc --noEmit` PASS. Commit.

### Task 2: Route `/studio/edit/[cert]` (server: owner check)

**Files:** Create `app/studio/edit/[cert]/page.tsx`.

- [ ] **Step 1:** Server async. `params.cert`; `createAuthClient().getUser()` (anon -> `/login`); admin `select` da `generations` per `certificate=cert` (`id, buyer_id, image_url, certificate, category, alias via avatars, edit_state`). Assente o `buyer_id !== user.id` -> `notFound()`. (Pattern owner-check di `app/api/content/[cert]/route.ts`.)
- [ ] **Step 2:** Passa al client: `cert`, image URL anteprima (`/api/content/${cert}`), `alias`, `category`, `editState` (DB o `defaultEditState()`).
- [ ] **Step 3:** Runtime: cert reale del seller -> 200; cert altrui/anon -> 404/redirect. Commit.

### Task 3: `EditorClient` shell (appbar + stage + anteprima)

**Files:** Create `app/studio/edit/[cert]/EditorClient.tsx`, `parts/ImageStage.tsx`.

- [ ] **Step 1:** Stato `EditState`. Layout mobile (immagine FISSA in alto, params scroll, export bar in fondo) come `anteprima_editor_mobile.html`; desktop (lg) 2 colonne (immagine `lg:sticky` sx, params dx) come `anteprima_editor_postproduzione.html`.
- [ ] **Step 2:** `ImageStage`: `<img src={imageUrl}>` con `style.filter=composeFilter(state).filter`; tag "anteprima · watermark", wordmark SEMBLIC, "Tieni premuto: originale" (pointerdown filter none, up/leave ripristina); layer vig/grain predisposti (opacita 0).
- [ ] **Step 3:** Appbar: "← Scena" (a `/match`), titolo "Semblic Editor · {alias}", "Salva" (F1 no-op/disabilitato, tooltip "salvataggio in arrivo"). Export bar: "Esporta e scarica" = download esistente con provenienza (`/api/content/${cert}`), nota "le modifiche entrano nell'export alla prossima fase".
- [ ] **Step 4:** Runtime (375px + 1280px): immagine carica, appbar/export bar, tieni-premuto mostra originale. Commit.

### Task 4: Preset strip + intensita

**Files:** Create `parts/PresetStrip.tsx`; Modify `EditorClient.tsx`.

- [ ] **Step 1:** 12 miniature (thumbnail = immagine col filter del preset, prototipo 261-263) + slider Intensita 0..100 (default 85). Aggiornano l'anteprima.
- [ ] **Step 2:** Runtime: "Bianco e nero" -> immagine B/N; intensita scala. Commit.

### Task 5: Luce + Colore + reset + confronto

**Files:** Create `parts/SliderSection.tsx`; Modify `EditorClient.tsx`.

- [ ] **Step 1:** `SliderSection` riusabile (titolo accordion + righe slider da `[key,label,min?,max?]`, una aperta alla volta, click sul valore = reset slider). Aggiorna `state.light[k]`/`state.color[k]`.
- [ ] **Step 2:** Montare "Luce" (`LIGHT`) e "Colore" (`COLOR`) + "Azzera tutte le modifiche".
- [ ] **Step 3:** Runtime: Esposizione/Temperatura cambiano l'anteprima; reset; confronto; mobile no overflow; desktop 2 colonne sticky. Commit.

### Task 6: Porta 1 — tasto "Modifica" in `/account` + CTA sul risultato Studio

**Files:** Modify componente "I miei contenuti" di `/account` (da individuare per le etichette Scarica/Condividi/Ricevuta); Modify `app/match/MatchClient.tsx`.

- [ ] **Step 1:** Individuare il componente che elenca le generazioni in `/account` con Scarica/Condividi/Ricevuta di conformita. Aggiungere un **tasto grande "Modifica" SOPRA** quelle azioni -> `Link` a `/studio/edit/${certificate}`.
- [ ] **Step 2:** In `MatchClient`, sul risultato di generazione, aggiungere CTA "Modifica" -> `/studio/edit/${certificate}` (NIENTE redirect forzato; il generatore resta 1 colonna).
- [ ] **Step 3:** Runtime: da `/account` "Modifica" apre l'editor sull'immagine giusta; dal risultato Studio idem. Commit.

### Task 7: Porta 2 — voce menu "Semblic Editor" + landing `/studio/edit`

**Files:** Create `app/studio/edit/page.tsx`; Modify la Navbar (struttura `NAV`).

- [ ] **Step 1:** `app/studio/edit/page.tsx` (landing): server, auth; elenca le generazioni dell'utente (galleria con anteprima via `/api/content/[cert]` o `image_url`), ognuna linka a `/studio/edit/[cert]`. Stato vuoto se 0 generazioni ("genera prima una foto"). Upload immagine = nota TODO futuro (non in questa fase).
- [ ] **Step 2:** Navbar: aggiungere **"Semblic Editor" sotto "Genera"** (sotto-voce nel raggruppamento del menu, struttura `NAV` unica desktop+mobile) -> `/studio/edit`.
- [ ] **Step 3:** Runtime: menu -> "Semblic Editor" -> galleria; clic su una generazione -> editor. Commit.

### Task 8: Verifica finale Fase 1 + STOP per conferma

- [ ] **Step 1:** `npx tsc --noEmit && npm run build` PASS.
- [ ] **Step 2:** Runtime a terra: editor raggiungibile dalle 3 vie (account, menu, risultato Studio); Preset+intensita+Luce+Colore live; confronto; reset; mobile 1 colonna (immagine fissa + accordion) no overflow; desktop 2 colonne (immagine sticky). Generatore `/match` invariato (UNA colonna).
- [ ] **Step 3:** **FERMARSI e mostrare a Morelz.** Non procedere a Fase 2 senza ok.

**Definition of done Fase 1:** Semblic Editor raggiungibile da `/account` (tasto Modifica), dal menu (voce "Semblic Editor" + galleria) e dal risultato Studio; Preset+intensita, Luce, Colore live; confronto originale; mobile accordion / desktop 2 colonne. Generatore a UNA colonna invariato; nessuna regressione su consenso/royalty/certificato/VOLT.

---

# FASE 2 — Mixer HSL + Curve + Dettaglio (task)

- **F2.1 Dettaglio ed effetti:** `SliderSection` con `DETAIL` (sharp/clar/tex/haze + vig 0..100 + grain 0..100); layer `vig` (radial-gradient) e `grain` (SVG noise) con opacita da stato (prototipo 43-44, 313); contributi dettaglio in `composeFilter` (riga 310).
- **F2.2 Mixer HSL:** `parts/HslMixer.tsx`, 3 tab (Tonalita/Saturazione/Luminanza) x 8 colori, slider -100..100 (prototipo 293-300); anteprima aggregata (`hslAgg`, riga 299); HSL selettivo vero = resa server (Fase 3).
- **F2.3 Curve:** `lib/editor/curves.ts` (eval + `tableValues`) + `parts/CurveEditor.tsx` (SVG, 4 canali, aggiungi/trascina/doppio-tocco-rimuove/reset; prototipo 267-290) + `<filter id="curveFilter">` nello stage + `url(#curveFilter)` in `composeFilter`.
- Verifica: anteprima fedele al prototipo; mobile no overflow; tsc+build; STOP per conferma.

# FASE 3 — Sheet Esporta + resa server `sharp` + persistenza (task)

- **F3.1 Sheet Esporta (UI):** `parts/ExportSheet.tsx` (sheet mobile / pannello desktop): Upscale 2K/4K, griglia formati (IG 4:5, Storia 9:16, LinkedIn 1.91:1, Ecom 1:1), azioni "Scarica con provenienza" / "Condividi come Storia" (riusa `ShareStoryButton`). Prototipo 206-227.
- **F3.2 `sharp` esplicito:** aggiungere `sharp` come dependency ESPLICITA in `package.json` (`npm install sharp`).
- **F3.3 Route `/api/edit/render`:** server, owner check; carica immagine PULITA; applica `edit_state` con `sharp` (preset/luce/colore = modulate/linear/tint; HSL selettivo; curve come LUT per canale; dettaglio; vignettatura/grana compositing); upscale; ritaglio formato; watermark invisibile + certificato come nel download. Ritorna il file finale.
- **F3.4 Migrazione + salvataggio:** `supabase/editor_state_fields.sql` (edit_state/upscale/export_format) APPLICATA; `/api/edit/save` persiste `edit_state` (owner check); "Salva"/export scrivono lo stato (riapribile: il landing e l'editor ricaricano lo stato salvato).
- Verifica: l'export scarica l'immagine MODIFICATA con upscale+provenienza; riaprendo l'editor lo stato torna. tsc+build; STOP per conferma.

# FASE 4 — "Dimmi cosa cambiare" (conversazionale) (task)

- **F4.1 AskBar UI:** `parts/AskBar.tsx` input + chip rapidi (prototipo 170-179, 334-354).
- **F4.2 Route interpret:** `app/api/edit/interpret/route.ts` (Claude API, pattern `app/api/enhance-prompt/route.ts`) -> JSON delta parametri; client li applica; fallback keyword (`cmd`, 335-351).
- Verifica: "piu caldo", "bianco e nero", "schiarisci" applicano modifiche; fallback offline; STOP / fine.

---

## Self-Review (eseguita su questo piano)

- **Copertura spec Parte B + richieste Morelz:** layout mobile/desktop editor (F1+design), preset+intensita (F1), Luce/Colore (F1), HSL (F2.2), Dettaglio+vig/grana (F2.1), Curve (F2.3), confronto (F1 T3), conversazionale (F4), Esporta+upscale+formati (F3.1), resa server sharp + non distruttivo + edit_state (F3.2-3.4), **tasto Modifica in /account** (F1 T6), **voce menu "Semblic Editor" + landing/galleria** (F1 T7), CTA sul risultato Studio non forzato (F1 T6). Coperto.
- **Niente 2 colonne sul generatore:** ribadito; 2 colonne SOLO per il desktop dell'editor. Generatore non toccato.
- **Coerenza tipi:** `EditState` (T1) usato da `composeFilter` (T1), `ImageStage`, `SliderSection`, resa server (F3); `curves.ts` (F2.3) alimenta `feComponentTransfer`; `edit_state` jsonb (F3.4) serializza `EditState`.
- **Limite dichiarato di F1:** l'EXPORT in Fase 1 scarica l'ORIGINALE (resa modifiche server-side, Fase 3): dichiarato nella UI, non e un bug.
- **Adattamento fasi:** F1 a step; F2-F4 a livello di task (la spec contiene gia le tabelle parametri, qui referenziate) da espandere in step prima di ciascuna, dopo conferma di Morelz.
