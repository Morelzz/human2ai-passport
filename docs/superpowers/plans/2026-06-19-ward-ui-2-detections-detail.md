# Ward UI 2 — Detections + Detail (3 comportamenti) + polish, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps `- [ ]`.

**Goal:** Completare la parte centrale della UI Ward: la tab **Detections** (lista + select-to-act + selection bar) e il **Detection detail** coi 3 comportamenti di sicurezza (standard / sensibile-sfocato / minore-locked), piu' 2 rifiniture (banner cookie nascosto su /ward, icone SVG dei tab).

**Architecture:** Resta tutto client dentro `WardApp` su dati DEMO. Tap su una detection -> stato `selected` che apre il Detail (overlay/screen con back), come il single-page mockup. Le regole di sicurezza (A2.6/A2.7) sono nel DATO: ogni detection demo ha `sensitivity` e il Detail sceglie il comportamento di conseguenza (il minore NON mostra mai nulla, nessun controllo di reveal).

**Tech Stack:** Next 16 / React 19 / TS, ward.css. Verifica nel preview.

**Riferimenti:** mockup `sentinel-mobile-v2.html` (sezione Detections + selbar) e `sentinel-detail.html` (i 3 comportamenti). Spec sez. 3.4/3.5 (regole A2). Branch `ward-module1`.

---

## Mappa file
- Modify: `components/legal/CookieBanner.tsx` — guard usePathname: niente banner su /ward.
- Modify: `app/ward/WardApp.tsx` — icone SVG nei tab; stato `selected` per il Detail.
- Modify: `app/ward/demo.ts` — aggiungere campi al tipo `WardDetection` (url, host, whois, why, aiVerdict, sensitivity, evidence) per alimentare il Detail.
- Create: `app/ward/Detections.tsx` — lista detections + selezione + selection bar.
- Create: `app/ward/DetectionDetail.tsx` — il dettaglio coi 3 comportamenti.
- Modify: `app/ward/ward.css` — classi portate dal mockup per cards/selbar/detail (prefisso `.ward-app`).

---

## Task 1: Polish (cookie su /ward + icone tab)

**Files:** `components/legal/CookieBanner.tsx`, `app/ward/WardApp.tsx`

- [ ] **Step 1: Guard cookie.** In `CookieBanner.tsx` aggiungere `import { usePathname } from "next/navigation";`, `const pathname = usePathname();` accanto agli altri hook, e dopo gli hook: `if (pathname?.startsWith("/ward")) return null;` (prima del `if (!open) return null`).
- [ ] **Step 2: Icone tab.** In `WardApp.tsx` dare a ogni tab il suo SVG (portati dal mockup tabbar: Radar=scudo+nodo, Detections=lente, Nemesis=scudo+linea, Vault=box). Il `TabBtn` riceve `icon: ReactNode` e lo rende sopra la `.lb`.
- [ ] **Step 3: Verifica.** preview: su /ward niente banner cookie; i tab mostrano l'icona; tap-target >= 44px (ora che c'e' l'icona). `npx tsc --noEmit` pulito.
- [ ] **Step 4: Commit** `Ward UI: niente banner cookie su /ward + icone bottom-nav`.

## Task 2: Detections (lista + select-to-act + selection bar)

**Files:** `app/ward/Detections.tsx` (create), `app/ward/WardApp.tsx` (render), `app/ward/ward.css` (classi card/selbar dal mockup)

- [ ] **Step 1:** Portare da `sentinel-mobile-v2.html` le classi `.filters .chip .card .card-row .shot .card-main .card-top .dom .score .threat .card-meta .selbox .review-foot .mini-act .selbar .nem-btn` in `ward.css`, prefissate `.ward-app`, colori mappati (Tabella A del piano shell).
- [ ] **Step 2:** `Detections.tsx`: lista da `data.detections`; ogni card mostra dom, score, threat (confirmed=coral, review=amber), meta; tap su una card confermata la seleziona (bordo coral + check); quando >=1 selezionata sale la `.selbar` con conteggio + bottone "Attiva Nemesis"; le review hanno "Conferma match". Tap su una card (non in selezione) apre il Detail (callback `onOpen(id)`).
- [ ] **Step 3:** Wire in `WardApp` (stato `selected: Set<string>`, `openId: string|null`).
- [ ] **Step 4:** Verifica preview (selezione, selbar che sale) + tsc. **Commit.**

## Task 3: Detection detail (3 comportamenti di sicurezza)

**Files:** `app/ward/DetectionDetail.tsx` (create), `app/ward/demo.ts` (campi extra), `app/ward/ward.css` (classi detail)

- [ ] **Step 1:** Estendere `WardDetection` in demo.ts con: `url, host, registrar, country, created, why, aiVerdict, hash, sensitivity: "standard"|"sensitive"|"minor"`. Aggiungere 1 detection demo `sensitive` e 1 `minor` (oltre alle standard).
- [ ] **Step 2:** Portare da `sentinel-detail.html` le classi `.preview .veil .trow .threat .banner .why .info .doss .actbar` in ward.css (prefisso `.ward-app`).
- [ ] **Step 3:** `DetectionDetail.tsx` con i 3 rami sullo STESSO scheletro:
  - `standard`: preview + "Perche' ha fatto match" (barra + %), verdetto AI, Source, WHOIS, dossier, azioni "Non sono io / Uso autorizzato / Colpisci con Nemesis".
  - `sensitive`: preview SFOCATA dietro veil ("Non sei obbligato a guardare. Nemesis puo' agire senza che tu veda"), banner care, route StopNCII, reveal opzionale.
  - `minor`: preview LOCKED (mai mostrata), banner child-safety, report reference NCMEC, **nessun controllo di reveal**, dettagli nascosti, azione "Segnalato alle autorita'". REGOLA: il ramo minor non rende MAI l'immagine ne' un bottone per vederla.
- [ ] **Step 4:** Verifica preview dei 3 stati (commutando la `sensitivity` della detage demo o tre detection demo diverse): standard mostra tutto; sensitive parte sfocata; minor non ha reveal e nasconde i dettagli. tsc pulito. **Commit.**

## Task 4: Verifica finale + screenshot
- [ ] preview: percorso completo (lista -> seleziona -> selbar; tap -> detail; i 3 comportamenti). Screenshot (sweep/anim fermi). Riportare a Morelz.

## Non in questo piano (UI 3)
- Overlay strike Nemesis (briefing -> cancel 4s -> sequenza) + tab Nemesis ops room + tab Vault.
- Innesto dati reali.
