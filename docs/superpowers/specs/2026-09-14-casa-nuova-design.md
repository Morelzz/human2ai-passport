# SEMBLIC, la casa nuova. Spec di design (14 settembre 2026)

Approvato da Morelz sul mockup "Semblic, la casa nuova" (artifact a773e546), direzione C
"luce con isole scure", con una modifica: l'hero non usa piu' il video del founder ma un
video generato con Seedance 2.5 (720p, quadrato) che racconta la conversione da persona
reale ad avatar AI e la rete globale del consenso.

## 1. Cosa cambia e cosa no

Cambia la pelle di TUTTO il sito pubblico e dell'area account, desktop e mobile.
Non cambiano: le rotte, i flussi (signup, KYC, generazione, Ward, Nemesis, Sigil, VOLT,
Stripe), i dati, i testi di sostanza (si rifiniscono, non si riscrivono), i founder e gli
avatar (i 12 sono beta tester veri con consenso firmato: mai toccarli).

## 2. Il sistema

### Colori (sorgente unica: `app/globals.css`)
- Corpo CHIARO di default: `--bg #F7F4EE` (avorio caldo, bassa croma), `--surface #FFFFFF`,
  `--elevated #FFFFFF`, testo `--text #17150F`, `--text-muted #5B564B`, `--text-faint #8C867A`,
  hairline `#E6E1D6`, bordo forte `#D9D3C5`.
- Un solo colore d'azione: ambra `#E29A2E` (hover `#D08A22`), testo su ambra `#412402`.
- Stati: verificato `#3E8E78` (soft `#E3F1EC`), bloccato `#CB5A3C`.
- ISOLE SCURE: sezioni con `data-theme="dark"` (meccanismo gia' presente) che ridichiarano
  i token obsidian: `--bg #0C0F17`, `--surface #141A24`, `--elevated #1E2530`, testo crema
  `#F2E9D8`, muted `rgba(242,233,216,.66)`, faint `rgba(242,233,216,.42)`, hairline
  `rgba(242,233,216,.14)`. Le isole sono: hero home, Ward/Nemesis (sezione home e /ward
  intero), Studio di generazione (/match e /studio/edit restano scuri: lavoro sull'immagine),
  appello finale, e le OG card.
- L'interruttore tema resta ma invertito: chiaro di default, "scuro" opzionale. I token
  Tailwind (`@theme inline`) restano con gli stessi nomi: le classi esistenti si ribaltano
  da sole. `bg-obsidian` in una pagina chiara = avorio: dove serve VERO scuro si usa l'isola.
- Colori scritti in oklch dove si definiscono gradienti o scale (color-mix per gli stati).

### Tipografia
- Display e testo: Instrument Sans (Google Fonts via `next/font`), pesi 400/500/600/700.
  Titoli 700, tracking -0.03/-0.04em, line-height 0.96-1.02. Niente piu' peso 200.
- Etichette e numeri: Geist Mono (gia' presente), tabular-nums.
- Scala: h1 84/46 (desktop/mobile), h2 52/34, h3 22/18, corpo 16-17, note 13-14.

### Componenti condivisi (pelle nuova, API invariata)
- `Button`: pillole, `primary` ambra, `secondary` bordo hairline, `ghost`, `outline`;
  etichette in sentence case (non piu' uppercase), tracking .02em.
- `Navbar`: chiara, sticky, sfondo avorio semitrasparente + blur; stesse voci (Avatar, Genera,
  Proteggi, Academy, Fiducia) + Accedi + pillola ambra "Entra nel registro". Drawer mobile
  chiaro. Badge VOLT invariato nel comportamento.
- Footer: chiaro, 4 colonne, wordmark gigante avorio scuro.
- `SectionTitle`: kicker mono ambra scuro + h2 pesante.
- Card: bianco, bordo hairline, raggio 20px, niente vetro. Il "glass" resta SOLO dentro le
  isole scure (vetro su obsidian).
- `CineBackground`, grana, stelle, vignetta: RIMOSSI dalle pagine chiare. Restano, alleggeriti,
  dentro le isole.
- Tile avatar: 3:4, raggio 18, chip "Verificata/o" in alto a sinistra, nome in basso.
  Sul telefono le liste lunghe di tile scorrono di lato (scroll-snap), mai colonne infinite.

### Motion e "strumenti nuovi"
- View Transitions gia' attive (next-view-transitions): si estendono ai ritratti (shared
  element) e ai titoli di pagina.
- Reveal allo scroll: CSS scroll-driven animations (`animation-timeline: view()`) con
  fallback statico; il componente `Reveal` (framer) resta solo dove serve orchestrazione.
- Container queries per le card (`@container`), `text-wrap: balance` sui titoli,
  `font-variant-numeric: tabular-nums` sui numeri.
- Lenis resta (smooth scroll), GSAP resta solo per la sequenza pinnata di "Come funziona".
- Three.js/VoidField: rimosso dalle pagine chiare; nell'appello finale resta un alone
  radiale CSS.
- `prefers-reduced-motion`: tutto statico.

## 3. Immagini e video
- Galleria del registro: 4 scene uguali per tutti gli 11 volti, generate con
  gpt-image-2.5-flare (studio su avorio, finestra, editoriale scura, citta' al tramonto),
  1024x1536, su storage `generations/repertorio-v2/<handle>/00..03.png`; `gallery_urls`
  e `portrait_url` aggiornati per riga (dati, non codice). Le vecchie restano in
  `repertorio/` per tornare indietro.
- Hero: video Seedance 2.5, 720p, 1:1, muto, loop con dip-to-dark; poster = primo frame.
  Caricato su storage `assets/hero-v3.mp4` + `hero-v3-poster.jpg`. Sul telefono il video
  sta sopra il titolo, su desktop a destra del titolo, sempre quadrato.

## 4. Homepage (ordine delle sezioni)
Nav · Hero (isola: titolo, sottotitolo, 2 CTA, 3 numeri veri, video quadrato) · Il registro
(chiaro, griglia 4 colonne / riga scorrevole) · Come funziona (3 card) · Ward e Nemesis
(isola, scheda finder vera) · Sigil (chiaro, card verificatore) · Strumenti e aziende +
fascia AI Act (chiaro) · L'appello (isola) · Footer.
Spariscono dalla home: Impact (la frase Spotlight va nel kicker dell'appello), ScanLocations
(resta in /scansione), Trust come sezione separata (diventa Sigil).

## 5. Le altre pagine
Stessa pelle, stesse regole. Ordine di lavoro: catalogo e passaporto (le pagine dei volti),
match e studio (isola scura di lavoro), account e volt, ward (isola), tutela e signup/avatar,
verify (Sigil), prezzi, academy, ai-act, blog, trasparenza, scansione, partner, studio,
enterprise, faq, contatti, legali, login/signup, 404.

## 6. Verifica
tsc 0, vitest verde, `next build` pulito, ogni pagina pubblica a 375px senza overflow
orizzontale e senza errori console, Lighthouse casa >= 90 su mobile. Pubblicazione solo a
"pubblica".
