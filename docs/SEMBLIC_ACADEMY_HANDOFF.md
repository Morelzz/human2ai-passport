# SEMBLIC · Handoff design per "Semblic Academy"

> Documento di consegna per chi costruisce **Semblic Academy** (nome di lavoro), una
> nuova pagina/sezione in **sinergia** con il sito Semblic attuale. Tutto qui è
> estratto dal codice reale di produzione: palette, font, struttura, movimento e
> voce. Obiettivo: che Academy sembri "nata dalla stessa mano" di Semblic.
>
> Estratto il 2026-06-22 da `app/globals.css`, `lib/ui.ts`, `app/layout.tsx`.

---

## 0. In una riga

Semblic è il **registro dei volti consenzienti**: estetica **dark-first**, premium,
avanguardia, "caveau di banca". Tre colori base: **Obsidian** (sfondo), **Lumen**
(testo), **Amber** (unica azione). Mai aspetto giocattolo, mai marketing generico.

Payoff del brand: **Real Humans. Real Rights. Real Earnings.**

---

## 1. Stack tecnico (per lavorare nello stesso ambiente)

| Cosa | Tecnologia |
|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** |
| Linguaggio | **TypeScript 5** |
| Styling | **Tailwind CSS v4** (config nel CSS: `@import "tailwindcss"` + `@theme`) |
| Font | **Geist Sans** (UI/testo) + **Geist Mono** (label/codice) via `next/font/google` |
| Animazioni | **framer-motion 12** (reveal/scroll), CSS keyframes |
| Smooth scroll | **lenis** |
| Transizioni di pagina | **next-view-transitions** |
| Icone | **lucide-react** (icone outline) |
| Effetti 3D/particelle (opzionale) | **three**, **gsap** |

> Una pagina Academy puramente di design **non ha bisogno di segreti/.env**: usa solo
> CSS, font e componenti. Se serve dati, si aggancia a Supabase come il resto del sito,
> ma per la veste grafica non serve.

---

## 2. Palette colori (sorgente di verità)

Sistema a **8 token + 3 gradienti**. Tutto deriva da Obsidian/Lumen/Amber. Il tema è
**scuro di default**; esiste un tema chiaro (avorio caldo) attivato da
`data-theme="light"` sull'`<html>`. **Amber e i testi-su-pieno sono costanti** nei due
temi; superfici, testo, bordi e stati cambiano.

### Token (tema scuro = default)

```css
/* Identità + superfici */
--bg:          #0C0F17;   /* Obsidian, sfondo pagina */
--surface:     #141A24;   /* card / pannelli */
--elevated:    #1E2530;   /* input, modali */
--edge:        #2C3440;   /* linee, divisori "solidi" */

/* Testo: Lumen a 3 intensità (MAI grigi puri) */
--text:        #F2E9D8;   /* Lumen, testo primario */
--text-muted:  #ADA89E;   /* secondario */
--text-faint:  #74716E;   /* terziario */

/* Bordi hairline = Lumen a bassa opacità */
--hairline:      rgba(242,233,216,0.12);
--hairline-soft: rgba(242,233,216,0.06);

/* Vetro / atmosfera */
--glass-bg:    rgba(242,233,216,0.04);
--nav-bg:          rgba(12,15,23,0.70);
--nav-bg-scrolled: rgba(12,15,23,0.90);
--star-ink:    rgba(242,233,216,0.16);

/* Azione (UNICA): Amber */
--amber-c:        #F2A93B;
--amber-hover-c:  #E29A2E;
--on-amber-c:     #412402;   /* testo SOPRA l'amber pieno */

/* Stati (significato di prodotto, non decorazione) */
--verified-c:  #7FAE96;   /* salvia: consenso OK / verificato / match */
--blocked-c:   #EE7A70;   /* coral: bloccato / nessun match / stop */
--on-verified-c:  #16352A;
--on-blocked-c:   #5A201B;
```

### Tema chiaro (avorio caldo) — gli stessi nomi cambiano valore

```css
[data-theme="light"] {
  --bg: #ECE6D6;  --surface: #F5F1E7;  --elevated: #FBF8F1;
  --text: #2A2418;  --text-muted: #6E6655;  --text-faint: #9A9080;
  --hairline: rgba(42,36,26,0.14);  --hairline-soft: rgba(42,36,26,0.07);
  --verified-c: #3E8E78;  --blocked-c: #CB5A3C;
  /* Amber, on-amber e i gradienti restano identici */
}
```

### Gradienti (SOLO sfondi/sezioni, MAI sui bottoni)

```css
--grad-tramonto: linear-gradient(135deg, #F2A93B 0%, #EE7A70 100%);  /* amber → coral */
--grad-aurora:   linear-gradient(135deg, #F2A93B 0%, #C25C3A 42%, #0C0F17 100%); /* amber → obsidian */
--grad-fiducia:  linear-gradient(135deg, #7FAE96 0%, #2E8B7E 100%);  /* salvia → teal */
```

### Tinte semitrasparenti (sfondi di pill/badge)

```
amber:  bg rgba(242,169,59,0.12)  · bordo rgba(242,169,59,0.3)
coral:  bg rgba(238,122,112,0.12) · bordo rgba(238,122,112,0.3)
salvia: bg rgba(127,174,150,0.12) · bordo rgba(127,174,150,0.3)
```

**Regole colore non negoziabili**
- Una sola **azione**: Amber pieno (`#F2A93B`), testo sopra `#412402`. **Mai gradienti sui bottoni.**
- Stati solo coral/salvia, e solo per **significato** (bloccato/verificato), mai per decoro.
- Il testo è **Lumen a opacità**, mai grigi inventati.
- I gradienti vivono solo come **sfondi di sezione**.

---

## 3. Tipografia

- **Geist Sans** = testo e UI. **Geist Mono** = etichette/kicker e codice.
- Caricati con `next/font/google` ed esposti come variabili: `--font-geist-sans`, `--font-geist-mono` (mappate su Tailwind `--font-sans` / `--font-mono`).

```ts
// app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// <html className={`${geistSans.variable} ${geistMono.variable}`}>
```

### Trattamento "display" (la firma del brand)

I titoli grandi sono **ultra-sottili**: peso **200**, tracking **-0.04em**. È la cosa
che dà l'aria premium. Esempio:

```html
<h1 style="font-weight:200; letter-spacing:-0.04em; line-height:0.95; color:var(--text)">
  Persone reali.
</h1>
```

### Kicker / etichetta HUD (mono)

Sopra le sezioni si usa un'etichetta in **mono, maiuscolo, spaziato**, con un quadratino
luminoso davanti:

```css
.label-mono {
  font-family: var(--font-geist-mono), monospace;
  font-size: 0.66rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
}
/* + un ::before quadrato luminoso (vedi globals.css) */
```

### Scala indicativa
- Display hero: 48–64px, peso 200, tracking -0.04em.
- H2 sezione: ~28–32px, peso 200–300.
- Corpo: 16px, line-height ~1.7.
- Label/kicker: 11–12px mono, uppercase, letter-spacing 0.18em.
- Niente font-size sotto 11px.

---

## 4. Geometria, superfici e atmosfera

### Raggi (da `lib/ui.ts`)
```
sm: 8 · md: 10 · lg: 16 · xl: 20 · pill: 999 (raggio pieno)
```
- **Bottoni = pillola** (raggio pieno).
- **Card = lg (16px)**.

### Bordi
- Sempre **hairline**: `1px solid var(--hairline)` (Lumen a 0.12) o `--hairline-soft` (0.06).
- Mai bordi grigi pieni.

### Vetro (la card-tipo del sito)
```css
.glass {
  background: var(--glass-bg);
  border: 1px solid var(--hairline);
  backdrop-filter: blur(16px) saturate(1.3);
  box-shadow:
    inset 0 1px 0 0 var(--hairline-soft),
    inset 0 -1px 0 0 rgba(0,0,0,0.25),
    0 14px 40px -18px rgba(0,0,0,0.55);
}
/* .glass-hover:hover → bordo amber tenue + translateY(-4px) + ombra amber */
```

### Atmosfera cinematografica (lo sfondo "Obsidian")
Dietro al contenuto (z-0) vive uno strato fisso fatto di: aloni radiali amber/coral/salvia
(`.cine-bg`), una trama di stelle (`.cine-stars`), una vignettatura (`.cine-vignette`) e
una grana sottile (`.grain`). Il contenuto sta sopra (z-2). Copia queste classi da
`globals.css` per avere lo stesso "respiro" notturno.

### Divisore tra sezioni
```css
.divider-glow {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(242,169,59,0.45) 35%, rgba(127,174,150,0.32) 65%, transparent);
  box-shadow: 0 0 18px rgba(242,169,59,0.25);
}
```

### Layout
- Contenuto in container centrato con `max-width` (es. `max-w-3xl` per testo, `max-w-6xl` per griglie), padding generoso, **mobile-first** (single column su mobile).
- **Vuoto che respira**: spaziature ampie tra sezioni.

---

## 5. Movimento e interazione

- **Reveal allo scroll**: con framer-motion (`initial/whileInView`, `viewport once`, easing `[0.22,1,0.36,1]`) o con la classe CSS `.reveal`.
- **Smooth scroll**: lenis (montato globalmente in layout).
- **Transizioni di pagina**: next-view-transitions (shared element sui ritratti via `viewTransitionName`).
- **Focus visibile sempre**: classe `.focus-ring` → outline amber 2px (accessibilità, non rimuovere).
- **`prefers-reduced-motion`**: tutte le animazioni si spengono (rispettare).

```jsx
// pattern reveal con framer-motion
<motion.section
  initial={{ opacity: 0, y: 18 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-40px" }}
  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
/>
```

---

## 6. Pattern di componenti (da `lib/ui.ts`, copia-incolla)

```ts
// Bottone primario — Amber PIENO, testo on-amber. MAI gradienti.
const buttonPrimary = {
  background: "#F2A93B", color: "#412402", border: "none",
  fontWeight: 800, fontSize: "0.9rem", borderRadius: 999,
  padding: "0.8rem 1.5rem", cursor: "pointer", textDecoration: "none",
  display: "inline-block", textAlign: "center",
};

// Bottone secondario — ghost: trasparente, bordo hairline.
const buttonSecondary = {
  background: "transparent", border: "1px solid rgba(242,233,216,0.12)",
  color: "#F2E9D8", fontWeight: 700, fontSize: "0.9rem", borderRadius: 999,
  padding: "0.8rem 1.5rem",
};

// Card
const card = { background: "#141A24", border: "1px solid rgba(242,233,216,0.10)", borderRadius: 16, padding: "1.5rem" };

// Pill / badge generica
function pill(fg, bg, border) {
  return { display:"inline-flex", alignItems:"center", gap:"0.4rem",
    background: bg, border:`1px solid ${border}`, color: fg, borderRadius: 999,
    padding:"0.25rem 0.75rem", fontSize:"0.72rem", fontWeight:700, letterSpacing:"0.04em" };
}
// es. badge "verificato": pill("#7FAE96", "rgba(127,174,150,0.12)", "rgba(127,174,150,0.3)")
```

Nota: il sito usa anche classi Tailwind con **alias storici** (`text-violet`, `text-teal`,
`text-crimson`, `bg-obsidian`...) che però puntano già ai nuovi valori (amber/salvia/coral).
Per Academy, **meglio usare i nomi nuovi** (`amber`, `verified`/`teal`, `blocked`/`crimson`,
`foreground`, `muted`, `surface`) o direttamente le CSS variables.

---

## 7. Voce e copy

- **Lingua: italiano.** Tono premium, sobrio, sicuro, mai gridato, mai "marketese".
- **Regola assoluta: MAI trattini lunghi (— o –)** nei testi pubblici. Usare virgole, due punti o parentesi.
- **Sentence case** (niente Title Case forzato, niente ALL CAPS se non per i kicker mono).
- Niente emoji nei testi di prodotto.
- Nome brand: **SEMBLIC**. La nuova sezione: **Semblic Academy** (nome di lavoro, può cambiare).
- Payoff: **Real Humans. Real Rights. Real Earnings.**

---

## 8. Le 10 regole d'oro (riassunto operativo)

1. Dark-first. Sfondo Obsidian `#0C0F17`, testo Lumen `#F2E9D8`.
2. Una sola azione: **Amber pieno**. Mai gradienti sui bottoni.
3. Stati solo **salvia** (ok) e **coral** (stop), per significato.
4. Bordi **hairline** (Lumen a opacità), mai grigi pieni.
5. Bottoni a **pillola**, card a raggio 16.
6. Titoli display **peso 200, tracking -0.04em**.
7. Font: **Geist Sans** + **Geist Mono** (kicker/label).
8. Gradienti solo come **sfondi di sezione** (tramonto/aurora/fiducia).
9. **Vuoto che respira** + atmosfera cinematografica + reveal soft allo scroll.
10. Copy italiano, **niente trattini lunghi**, niente aspetto giocattolo.

---

## 9. File da consegnare alla collaboratrice

**Essenziali (il cuore del design):**
1. **Questo documento** (`docs/SEMBLIC_ACADEMY_HANDOFF.md`) — autosufficiente.
2. **`app/globals.css`** — token CSS, tema chiaro/scuro, `.glass`, `.cine-bg`/`.cine-stars`/`.cine-vignette`/`.grain`, `.label-mono`, `.divider-glow`, scrollbar, prose. È la sorgente di verità dello stile.
3. **`lib/ui.ts`** — token e frammenti di stile in TS (colori, gradienti, raggi, tinte, bottoni, card, pill).
4. **`app/layout.tsx`** — setup font Geist, anti-lampo tema, smooth scroll, view transitions (per replicare l'ambiente).

**Utili (per vedere i pattern applicati):**
5. Una pagina d'esempio del sito (es. `app/page.tsx` la home, o `app/passport/[handle]/PassportClient.tsx`) per vedere card, badge, sezioni e reveal nel concreto.
6. Il componente sfondo (`components/marketing/CineBackground.tsx`) se vuole lo stesso "void" notturno.

**Da NON consegnare:** `.env*`, chiavi, cartelle `supabase/` con dati, `node_modules`. Per il design non servono.

> Opzione pratica: dalle il repo in sola lettura (senza `.env`) + questo handoff come bussola. Oppure solo i 4 file essenziali + handoff se costruisce un progetto separato.

---

## 10. Starter minimo di pagina Academy (rispetta tutto)

Pagina Next App Router che usa già i token giusti (da incollare in `app/academy/page.tsx`
nello stesso repo, oppure adattare in un progetto nuovo che importa `globals.css`):

```tsx
export default function AcademyPage() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "6rem 1.5rem" }}>
        <p className="label-mono" style={{ color: "var(--amber-c)" }}>SEMBLIC ACADEMY</p>
        <h1 style={{ fontWeight: 200, letterSpacing: "-0.04em", fontSize: "clamp(2.4rem,6vw,4rem)", lineHeight: 1, margin: "1rem 0 1.2rem" }}>
          Impara a usare i volti, nel rispetto delle persone.
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.7, maxWidth: 620 }}>
          Una riga di sottotitolo sobria e premium. Niente trattini lunghi, sentence case.
        </p>
        <div style={{ display: "flex", gap: "0.8rem", marginTop: "2rem", flexWrap: "wrap" }}>
          <a href="#" style={{ background: "var(--amber-c)", color: "var(--on-amber-c)", fontWeight: 800, borderRadius: 999, padding: "0.85rem 1.6rem", textDecoration: "none" }}>Inizia il corso</a>
          <a href="#" style={{ background: "transparent", color: "var(--text)", border: "1px solid var(--hairline)", fontWeight: 700, borderRadius: 999, padding: "0.85rem 1.6rem", textDecoration: "none" }}>Scopri di più</a>
        </div>
      </section>
    </main>
  );
}
```

---

### Una sintesi per la collaboratrice
> Costruisci su **Obsidian/Lumen/Amber**, font **Geist**, titoli **sottilissimi**, bottoni
> a **pillola Amber**, card **glass** con bordi **hairline**, gradienti **solo come sfondi**,
> movimento **soft**, copy **italiano senza trattini lunghi**. Se hai un dubbio cromatico o
> di spaziatura, apri `globals.css`: lì c'è la verità.
