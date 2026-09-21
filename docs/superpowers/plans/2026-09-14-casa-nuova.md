# SEMBLIC, la casa nuova. Piano di lavoro

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Stato 14/9 notte:** Task 1-11 fatti in 11 commit locali (17485ac..68baad1), tsc 0, 258 test, pagine verificate a 375px. Resta Task 12 (build, Lighthouse, pubblica). greta senza galleria: OpenAI senza crediti.

**Goal:** ripellare tutto semblic.com nella direzione C (corpo chiaro, isole scure), desktop e mobile, con la galleria degli avatar rigenerata da gpt-image-2.5 e un hero video quadrato generato con Seedance 2.5.

**Architecture:** la pelle vive in un solo posto, `app/globals.css` (token di tema, chiaro di default, scuro per isola via `data-theme="dark"`) piu' quattro componenti condivisi (Button, Navbar, Footer, SectionTitle) e un mattone nuovo (AvatarTile). Le pagine si aggiornano cambiando classi e componenti, mai i flussi. Immagini e video sono dati (storage + colonne), non codice.

**Tech Stack:** Next 16 (app router, next/font, next-view-transitions), Tailwind 4 (`@theme inline`), framer-motion 12, GSAP (solo "Come funziona"), Lenis, sharp, Supabase Storage. Test: vitest. Tipi: `node node_modules/typescript/bin/tsc --noEmit`.

Regole che valgono per OGNI task di pagina (si chiamano "regole di pelle" e i task le citano per nome):
- R1. Via `<CineBackground />` e il wrapper `bg-obsidian text-foreground` dalle pagine chiare: il body e' gia' avorio. Il contenuto resta dentro `relative z-[2]` solo dove serve davvero.
- R2. `glass`/`glass-hover` solo dentro un'isola (`data-theme="dark"`). Fuori diventano `card` (classe nuova in globals: bianco, hairline, raggio 20).
- R3. `label-mono text-violet-light` diventa `kicker` (classe nuova: Geist Mono 11px, tracking .18em, colore `--amber-ink`). Dentro le isole il kicker prende `text-[#E5B57A]`.
- R4. Titoli: via `font-extralight`/`font-light` e `uppercase` dai titoli. h1/h2 `font-bold tracking-[-0.035em]`. Sentence case.
- R5. Bottoni: solo `Button` (variant primary/secondary/ghost/outline). Niente uppercase nelle etichette.
- R6. Colori a mano (`text-[rgba(242,233,216,...)]`, `bg-white/[0.03]`, `border-white/10`) diventano token: `text-muted`, `text-faint`, `bg-surface`, `border-border`.
- R7. Mobile: ogni griglia di tile o card lunga diventa riga scorrevole (`riga-scorrevole` classe nuova, scroll-snap) sotto `sm`; sopra resta griglia.
- R8. Verifica per ogni pagina: 375px senza overflow orizzontale, console pulita, tema chiaro leggibile; isola scura leggibile.

---

### Task 1: Token del tema, font e classi di base

**Files:**
- Modify: `app/globals.css` (blocco `:root`/`[data-theme]`, aggiunge `.card`, `.kicker`, `.riga-scorrevole`, `.isola`, scroll-driven reveal)
- Modify: `app/layout.tsx` (font Instrument Sans, script anti-lampo default light, themeColor)
- Modify: `components/ThemeToggle.tsx` (default light)

- [x] **Step 1: Token chiaro di default, scuro per isola.** In `app/globals.css` sostituire il blocco `:root, [data-theme="dark"] {...}` e `[data-theme="light"] {...}` con:

```css
:root, [data-theme="light"] {
  --bg: #F7F4EE; --surface: #FFFFFF; --elevated: #FFFFFF; --edge: #D9D3C5;
  --text: #17150F; --text-muted: #5B564B; --text-faint: #8C867A;
  --hairline: #E6E1D6; --hairline-soft: #EFEBE2;
  --nav-bg: rgba(247,244,238,0.78); --nav-bg-scrolled: rgba(247,244,238,0.94);
  --glass-bg: rgba(255,255,255,0.62); --star-ink: rgba(23,21,15,0.10);
  --verified-c: #3E8E78; --verified-soft: #E3F1EC; --blocked-c: #CB5A3C; --blocked-soft: #F8E6E0;
  --amber-c: #E29A2E; --amber-hover-c: #D08A22; --amber-soft: #F8E9CF; --amber-ink: #B85C10;
  --on-amber-c: #412402; --on-verified-c: #16352A; --on-blocked-c: #5A201B;
  --grad-tramonto: linear-gradient(135deg, #E29A2E 0%, #E0715F 100%);
  --grad-aurora: linear-gradient(135deg, #E29A2E 0%, #C25C3A 42%, var(--bg) 100%);
  --grad-fiducia: linear-gradient(135deg, #7FAE96 0%, #2E8B7E 100%);
  --action: var(--amber-c); --action-hover: var(--amber-hover-c); --text-on-amber: var(--on-amber-c);
}
[data-theme="dark"] {
  --bg: #0C0F17; --surface: #141A24; --elevated: #1E2530; --edge: #2C3440;
  --text: #F2E9D8; --text-muted: rgba(242,233,216,0.66); --text-faint: rgba(242,233,216,0.42);
  --hairline: rgba(242,233,216,0.14); --hairline-soft: rgba(242,233,216,0.07);
  --nav-bg: rgba(12,15,23,0.70); --nav-bg-scrolled: rgba(12,15,23,0.90);
  --glass-bg: rgba(242,233,216,0.05); --star-ink: rgba(242,233,216,0.16);
  --verified-c: #7FAE96; --verified-soft: rgba(127,174,150,0.16); --blocked-c: #EE7A70; --blocked-soft: rgba(238,122,112,0.16);
  --amber-soft: rgba(226,154,46,0.16); --amber-ink: #E5B57A;
}
```
e aggiungere ai token Tailwind `--color-amber-soft: var(--amber-soft); --color-amber-ink: var(--amber-ink); --color-verified-soft: var(--verified-soft); --color-blocked-soft: var(--blocked-soft);`.

- [x] **Step 2: Classi di base.** Aggiungere in globals:

```css
.card { background: var(--surface); border: 1px solid var(--hairline); border-radius: 20px; }
.kicker { font-family: var(--font-geist-mono), monospace; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--amber-ink); }
.isola { background: var(--bg); color: var(--text); border-radius: 28px; position: relative; overflow: hidden; }
.riga-scorrevole { display: flex; gap: 0.75rem; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 0.5rem; scrollbar-width: none; }
.riga-scorrevole::-webkit-scrollbar { display: none; }
.riga-scorrevole > * { scroll-snap-align: start; flex: 0 0 auto; }
@supports (animation-timeline: view()) {
  .sv { animation: sv-in linear both; animation-timeline: view(); animation-range: entry 0% entry 40%; }
  @keyframes sv-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
}
@media (prefers-reduced-motion: reduce) { .sv { animation: none; } }
```
Le classi `.cine-bg`, `.cine-stars`, `.cine-vignette`, `.grain` restano (le usano le isole via `CineBackground` dove serve), ma i loro override `[data-theme="light"]` diventano il default chiaro (aurora piu' tenue).

- [x] **Step 3: Font.** In `app/layout.tsx` sostituire `Geist` con `Instrument_Sans` (variabile `--font-instrument`), tenere `Geist_Mono`; in globals `--font-sans: var(--font-instrument)`. Script anti-lampo: `(t==='light'||t==='dark')?t:'light'` e fallback `'light'`. `themeColor: "#F7F4EE"`. `statusBarStyle: "default"`.

- [x] **Step 4: ThemeToggle** legge/scrive `semblic-theme` con default `light`.

- [x] **Step 5: Verifica.** `node node_modules/typescript/bin/tsc --noEmit` = 0; `npm test` verde; dev server, home a 375px e 1440: sfondo avorio, testo leggibile (le sezioni sono ancora "vecchie": e' atteso).

- [x] **Step 6: Commit** "Casa nuova 1: tema chiaro di default, isole scure, Instrument Sans".

### Task 2: Button, SectionTitle, Navbar, Footer, AvatarTile

**Files:**
- Modify: `components/ui/button.tsx` (pillole, sentence case, varianti su token)
- Modify: `components/marketing/SectionTitle.tsx` (kicker + h2 pesante, allineato a sinistra, prop `align`)
- Modify: `components/marketing/Navbar.tsx` (chiara, pillola "Entra nel registro", drawer chiaro)
- Create: `components/marketing/Footer.tsx` (estratto da `app/page.tsx`, chiaro, wordmark gigante)
- Create: `components/avatar/AvatarTile.tsx` (tile 3:4, chip Verificata/o, nome, view transition)
- Modify: `app/page.tsx` (usa Footer)

- [x] **Step 1: Button.** Base: `rounded-full font-semibold tracking-[0.02em]` (via `uppercase tracking-[0.05em]`). Varianti: `primary: bg-amber text-on-amber hover:bg-amber-hover`, `secondary: border border-edge text-foreground hover:border-amber/60 bg-surface/0`, `ghost: text-muted hover:text-foreground`, `outline: border border-amber/50 text-amber-ink hover:border-amber`. Size: `sm h-9 px-4 text-[0.8rem]`, `md h-11 px-6 text-[0.9rem]`, `lg h-13 px-8 text-[0.95rem]`.
- [x] **Step 2: SectionTitle** rende `<div class="mb-8"><span class="kicker">{kicker}</span><h2 class="mt-2 text-[2.1rem] font-bold leading-[1] tracking-[-0.035em] sm:text-[3.25rem]">{children}</h2>{subtitle && <p class="mt-3 max-w-[52ch] text-[1.05rem] text-muted">…</p>}</div>`. Firma: `{ kicker?: string; children; subtitle?: string; className?: string; align?: "left"|"center" }` (default left). Le chiamate esistenti `<SectionTitle subtitle="…">Ward</SectionTitle>` continuano a compilare.
- [x] **Step 3: Navbar.** Header `bg-[var(--nav-bg)]` (gia' token) senza ombre scure; voci top `text-[0.9rem] font-medium normal-case tracking-normal text-muted`; underline ambra resta; pannello tendina `card shadow-[0_20px_60px_-30px_rgba(23,21,15,.35)]`; azione destra: `Accedi` + `<Button size="sm">Entra nel registro</Button>` (href `/signup/avatar`); drawer: sfondo `bg-surface`, overlay `bg-black/30`, testo `text-foreground`.
- [x] **Step 4: Footer.tsx** con lo stesso contenuto del footer di `app/page.tsx` ma: `border-t border-border`, colonne con `kicker`, wordmark `text-[#ECE6D9]` (in isola: `text-[rgba(242,233,216,.06)]`). `app/page.tsx` importa `<Footer />`.
- [x] **Step 5: AvatarTile.tsx**

```tsx
"use client";
import { Link } from "next-view-transitions";
import { portraitFor } from "@/lib/sample-galleries";
export type TileAvatar = { handle: string; alias: string; gallery_urls?: unknown; revoked_at?: string | null; gender?: string | null };
export function AvatarTile({ a, className = "" }: { a: TileAvatar; className?: string }) {
  const src = portraitFor(a);
  const chip = a.revoked_at ? "Revocato" : a.gender === "donna" ? "Verificata" : "Verificato";
  return (
    <Link href={`/passport/${a.handle}`} className={`group relative block aspect-[3/4] overflow-hidden rounded-[18px] bg-[#E7E1D3] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={a.alias} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" style={{ viewTransitionName: `vt-portrait-${a.handle}` }} />
      <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.1em] ${a.revoked_at ? "bg-blocked-soft text-on-blocked" : "bg-white/92 text-on-verified"}`}><i className={`h-1.5 w-1.5 rounded-full ${a.revoked_at ? "bg-blocked" : "bg-verified"}`} />{chip}</span>
      <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" aria-hidden />
      <span className="absolute bottom-3 left-3.5 text-[0.95rem] font-semibold text-white">{a.alias}</span>
    </Link>
  );
}
```
- [x] **Step 6:** tsc 0, test verdi, commit "Casa nuova 2: bottoni, titoli, nav e footer chiari, tile avatar".

### Task 3: Hero con video quadrato

**Files:**
- Modify: `components/marketing/HeroVideo.tsx` (sorgenti `hero-v3.mp4`/`hero-v3-poster.jpg`, aspect square, prop `square`)
- Modify: `components/marketing/Hero.tsx` (isola, griglia 1.15fr/.85fr, video a destra, 3 numeri)
- Dati: caricare su storage `assets/hero-v3.mp4` (720x720, muto, h264, ~1-2 MB) e `assets/hero-v3-poster.jpg` con `scripts/upload-asset.mjs`.

- [x] **Step 1:** HeroVideo: `VIDEO = ${BASE}/hero-v3.mp4`, `POSTER = ${BASE}/hero-v3-poster.jpg`; il contenitore non e' piu' `absolute inset-0` ma un riquadro `aspect-square rounded-[24px] overflow-hidden` (className dal padre). Dip-to-dark invariato.
- [x] **Step 2:** Hero.tsx: `<section className="mx-auto max-w-7xl px-4 pt-2 sm:px-8"><div data-theme="dark" className="isola grid gap-8 px-6 py-10 sm:px-14 sm:py-16 lg:grid-cols-[1.15fr_.85fr]" style={{background:"radial-gradient(70% 60% at 0% 0%,rgba(226,154,46,.20),transparent 65%),#0C0F17"}}>` con: kicker, h1 `text-[2.9rem] sm:text-[4.4rem] lg:text-[5.25rem] font-bold leading-[.96] tracking-[-0.04em]` (Earnings in `text-amber`), hairline, sottotitolo `text-muted`, 2 Button, riga numeri `count`, `paidCount` (nuova prop: generazioni commerciali), `protectedFaces`. Sul mobile (`lg:` giu') il video viene PRIMA del testo (`order-first lg:order-none`).
- [x] **Step 3:** `app/page.tsx` passa `paidCount` = `count` di `generations` con `mode='commercial'` (query `head:true, count:'exact'`).
- [x] **Step 4:** tsc, test, verifica 375/1440, commit "Casa nuova 3: hero in isola col video quadrato".

### Task 4: Home, le sezioni

**Files:** `app/page.tsx`, `components/marketing/{Registry,HowItWorks,WardSection,Trust,ToolsBusiness,AiActStrip,ClosingCTA}.tsx`; rimuovere dalla home `Impact`, `ScanLocations`.

- [x] **Step 1: Registry.** Griglia `grid-cols-2 sm:grid-cols-4 gap-4` di `AvatarTile` (8 volti) su desktop; sotto `sm` `riga-scorrevole` con tile `w-[170px]`. Testata: `SectionTitle kicker="Il registro" subtitle="Volti veri, scelti e pagati. Ogni immagine e' generata da Semblic con il consenso della persona che vedi.">Persone, non prompt.</SectionTitle>` + `<Button variant="secondary" asChild><Link href="/catalogo">Tutti gli {total} volti</Link></Button>`.
- [x] **Step 2: HowItWorks.** Tre `card p-7` con `step-n` (kicker in pillola `bg-amber-soft text-amber-ink`), h3 `text-[1.35rem] font-bold tracking-[-0.02em]`, testo `text-muted`. Pin GSAP resta ma su sfondo chiaro; via `glass` e `perspective`.
- [x] **Step 3: WardSection.** `data-theme="dark" isola grid lg:grid-cols-2 p-8 sm:p-14` con testo a sinistra (mirino `NemesisMark` + kicker "Ward e Nemesis", h2 "Ward trova le copie. Nemesis le rimuove.", p, 2 Button) e a destra la scheda finder (`bg-surface border border-border rounded-[22px] p-5`): miniatura + "N copie trovate", tre righe con semaforo, piede "1 copia confermata pronta da rimuovere" + Button "Nemesis". Le tre righe sono ESEMPIO statico dichiarato (`aria-label="Esempio"`).
- [x] **Step 4: Trust -> Sigil.** Sezione chiara a due colonne: testo + `card p-6` col drop-zone tratteggiato e la riga di esito `bg-verified-soft`. Via `VoidField`.
- [x] **Step 5: ToolsBusiness + AiActStrip.** Tre `card p-7`; la fascia AI Act diventa una `card` con sfondo `linear-gradient(90deg,#FBF1E0,#FFF 60%)` e due Button secondary.
- [x] **Step 6: ClosingCTA.** `data-theme="dark" isola text-center px-6 py-16 sm:py-24` con kicker "L'appello", h2 "L'epoca dei volti senza nome finisce qui.", p, Button "Entra in SEMBLIC". Via `VoidField`.
- [x] **Step 7: page.tsx.** Via `CineBackground`, `Impact`, `ScanLocations`; ordine: SiteNav, Hero, Registry, HowItWorks, WardSection, Trust(Sigil), ToolsBusiness(+AiAct), ClosingCTA, Footer. Sostituire `<Reveal>` con `className="sv"` sui `<section>`.
- [x] **Step 8:** tsc, test, 375/1440, Lighthouse mobile. Commit "Casa nuova 4: la homepage".

### Task 5: Galleria del registro (dati)

**Files:** script fuori repo `scratchpad/pubblica-galleria.mjs` (legge `.env.local`, non si committa).

- [x] **Step 1:** per ogni handle con 4 file in `galleria-v2/<handle>/`: upload su bucket pubblico `generations` path `repertorio-v2/<handle>/0N.png` (x-upsert).
- [x] **Step 2:** `PATCH avatars?handle=eq.<h>` con `gallery_urls: [4 url]`, `portrait_url: url 00`.
- [x] **Step 3:** `lib/sample-galleries.ts`: la mappa fallback punta a `repertorio-v2` per random/asia/gabriella (commit).
- [x] **Step 4:** verifica `/api/sample/<handle>/0` risponde 200 per gli 11; commit.

### Task 6: Catalogo e passaporto
**Files:** `app/catalogo/page.tsx`, `app/passport/[handle]/page.tsx`, `app/AvatarCard.tsx`.
- [x] Catalogo: griglia di `AvatarTile` (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`), filtri come pillole `secondary`. AvatarCard resta per le liste compatte con stile su token (R6).
- [x] Passaporto: testata chiara con ritratto grande (`AvatarTile` senza link, o img con view transition), galleria 4 immagini in griglia 2x2 / riga scorrevole, timeline consenso in `card`, CTA "Genera con questo avatar" `primary`. R1-R8.
- [x] tsc, verifica, commit "Casa nuova 5: catalogo e passaporto".

### Task 7: Studio di generazione e editor (isole di lavoro)
**Files:** `app/match/MatchClient.tsx`, `app/match/studio/StudioPanel.tsx`, `app/studio/edit/**`.
- [x] La pagina resta SCURA: wrapper `data-theme="dark"` sul contenitore principale (il lavoro sull'immagine vuole il buio). R2 (glass ok qui), R3 con `text-[#E5B57A]`, R4, R5. La Navbar sopra resta chiara.
- [x] tsc, verifica, commit "Casa nuova 6: Studio ed Editor, isole di lavoro".

### Task 8: Account, VOLT, attivita'
**Files:** `app/account/**`, `components/account/**`, `components/volt/**`.
- [x] Pagine chiare: `card` al posto di `glass`, grafici SVG con `stroke: var(--amber-c)`, badge VOLT su token, griglia contenuti con `AvatarTile`-like per le generazioni (R7 sul mobile).
- [x] tsc, verifica, commit "Casa nuova 7: account e VOLT".

### Task 9: Ward, Tutela, funnel protetto, Sigil
**Files:** `app/ward/**`, `app/tutela/page.tsx`, `app/signup/avatar/**`, `app/proteggi/**`, `app/verify/**`.
- [x] `/ward` e `/ward/content/[id]`: isola scura intera (layout `data-theme="dark"` gia' esiste: allineare token), card `glass`; `WardIntro` in chiaro? NO: Ward e' scuro per scelta di spec.
- [x] Tutela e funnel: chiari, `card`, Button.
- [x] `/verify` (Sigil): chiaro, drop-zone `card`, esito su `verified-soft`/`blocked-soft`.
- [x] tsc, verifica, commit "Casa nuova 8: Ward scuro, tutela e Sigil chiari".

### Task 10: Pagine editoriali e commerciali
**Files:** `app/{prezzi,academy,ai-act,blog,blog/[slug],trasparenza,scansione,scansione/prenota,partner,studio,enterprise,enterprise/register,faq,contatti,sviluppatori,badge,report,receipt/[cert]}/page.tsx` + `components/business/**`, `components/marketing/{TeamSection,SediMap,PublicRoadmap,WardDemo}.tsx`.
- [x] R1-R8 su ognuna, in quest'ordine. `SediMap`: via il filtro `invert` sulle tile (mappa chiara). `PublicRoadmap` e `WardDemo`: card chiare.
- [x] tsc, verifica ogni pagina a 375, commit ogni 4-5 pagine ("Casa nuova 9a/9b/9c").

### Task 11: Login, signup, legali, 404, OG
**Files:** `app/{login,signup,privacy,termini,cookie,consent/[token]}/**`, `app/not-found.tsx`, `app/opengraph-image.tsx`, `app/**/opengraph-image.tsx`, `components/legal/CookieBanner.tsx`.
- [x] Login/signup: `card` centrata su avorio, Button primary. Legali: prosa `prose-semblic` su chiaro (i colori sono gia' token). Cookie banner: `card`. OG: restano scure (isola) con Instrument Sans caricata via `fetch` del font (next/og), wordmark e ritratto.
- [x] tsc, verifica, commit "Casa nuova 10: accesso, legali, social".

### Task 12: Collaudo finale e pubblicazione
- [ ] `next build` pulito; `npm test`; giro browser a 375 e 1440 su TUTTE le rotte pubbliche: zero overflow, zero errori console.
- [ ] Lighthouse mobile home >= 90.
- [ ] Aggiornare memoria `ward-v2-live` (stato) e questo piano (spunte).
- [ ] Push e deploy SOLO a "pubblica".
