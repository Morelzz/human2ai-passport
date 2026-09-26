---
name: SEMBLIC
description: The consent registry for real human faces in AI imagery. Warm ivory page, one amber action, one real photo seen from both sides.
colors:
  ivory-bg: "#F7F4EE"
  surface: "#FFFFFF"
  edge: "#D9D3C5"
  hairline: "#E6E1D6"
  hairline-soft: "#EFEBE2"
  ink: "#17150F"
  ink-muted: "#5B564B"
  ink-faint: "#736D62"
  portrait-well: "#E7E1D3"
  person-panel: "#F1EAE8"
  amber: "#E29A2E"
  amber-hover: "#D08A22"
  amber-soft: "#F8E9CF"
  amber-ink: "#9A4A0B"
  on-amber: "#412402"
  verified: "#2F7563"
  verified-soft: "#E3F1EC"
  on-verified: "#16352A"
  consent-pill: "#D6EBCF"
  on-consent-pill: "#184A1D"
  blocked: "#B0472B"
  blocked-soft: "#F8E6E0"
  on-blocked: "#5A201B"
  island-bg: "#0C0F17"
  island-surface: "#141A24"
  island-elevated: "#1E2530"
  island-edge: "#2C3440"
  island-text: "#F2E9D8"
  island-amber-ink: "#E5B57A"
  island-verified: "#7FAE96"
  island-blocked: "#EE7A70"
  island-on-consent-pill: "#BFE0C9"
typography:
  display:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "4.9rem"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  display-short:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "clamp(2.9rem, 6.6vh, 4.9rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.035em"
  page-title:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.035em"
  price:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "3.4rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  panel-name:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1.9rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  lead-large:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 400
    lineHeight: 1.625
  panel-line:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 400
    lineHeight: 1.5
  lead:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  nav-link:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 500
    lineHeight: 1.5
  label-large:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "Instrument Sans, system-ui, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.01em"
  numeral:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1.7rem"
    fontWeight: 600
    lineHeight: 1.5
    fontFeature: "tnum"
rounded:
  sm: "10px"
  md: "12px"
  inner: "14px"
  panel: "16px"
  tile: "18px"
  card: "20px"
  island: "28px"
  pill: "9999px"
spacing:
  gap-sm: "12px"
  gap-md: "16px"
  gap-door: "20px"
  card-pad: "24px"
  door-pad: "28px"
  gutter: "20px"
  gutter-wide: "32px"
  section: "80px"
  section-wide: "96px"
  container: "1280px"
  container-wide: "1380px"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.on-amber}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.amber-hover}"
    textColor: "{colors.on-amber}"
  button-primary-large:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.on-amber}"
    rounded: "{rounded.pill}"
    padding: "0 32px"
    height: "52px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ivory-bg}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-door:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.on-amber}"
    typography: "{typography.label-large}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "56px"
    width: "100%"
  button-door-person:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ivory-bg}"
    typography: "{typography.label-large}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "56px"
    width: "100%"
  door-creator:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "28px"
  door-person:
    backgroundColor: "{colors.person-panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "28px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  chip-verified:
    backgroundColor: "{colors.verified-soft}"
    textColor: "{colors.on-verified}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  chip-consent-large:
    backgroundColor: "{colors.consent-pill}"
    textColor: "{colors.on-consent-pill}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  chip-blocked:
    backgroundColor: "{colors.blocked-soft}"
    textColor: "{colors.on-blocked}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  avatar-tile:
    backgroundColor: "{colors.portrait-well}"
    rounded: "{rounded.tile}"
  island:
    backgroundColor: "{colors.island-bg}"
    textColor: "{colors.island-text}"
    rounded: "{rounded.island}"
    padding: "64px"
  nav-bar:
    backgroundColor: "rgba(247,244,238,0.78)"
    textColor: "{colors.ink-muted}"
    height: "76px"
  cookie-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ivory-bg}"
    rounded: "{rounded.panel}"
    padding: "10px 10px 10px 16px"
  buy-bar:
    backgroundColor: "rgba(247,244,238,0.94)"
    textColor: "{colors.ink}"
    padding: "12px 16px"
---

# Design System: SEMBLIC

<!-- Recorded 27/9/2026 from the shipped code, updated the same evening after commit b6a48f0 ("Le due porte"): app/globals.css (theme variables, the Tailwind v4 @theme bridge, the home first-viewport rules), components/marketing/DuePorte.tsx, components/marketing/Navbar.tsx, components/legal/CookieBanner.tsx, app/passport/[handle]/page.tsx and PassportClient.tsx, components/ui/button.tsx, lib/ui.ts. Direction contract for the home: .impeccable/surfaces/app-page-tsx.md; product context: PRODUCT.md. The file docs/archivio-DESIGN-dala-superato.md describes a superseded direction and has no authority. -->

## Overview

**Creative North Star: "The Warm Registry"**

SEMBLIC reads like a well-kept public register printed on warm paper: an ivory page (never pure white), near-black ink, hairline rules, and real faces in rounded frames. One colour acts, the amber; two colours testify, a quiet green for consent that is live and a brick red for consent that is revoked or blocked. Everything else is ink at three strengths on ivory, white and a faint rose paper for the person's side.

The page is light by default (`data-theme="light"` is set before first paint in `app/layout.tsx`). The home opens on **the two doors**: one real certified photo seen from both sides, the creator's panel in white with the price and the amber action, the person's panel in `person-panel` with her portrait, what she received and a black action. The two audiences weigh the same. **Islands** (a section marked `data-theme="dark"` that flips every token inside it to night blue with cream text, 28px corners) still exist lower on the home page (IlSet, WardSection, ClosingCTA) and on other surfaces; direction B asks for light surfaces throughout the home, so those three are recorded as current state and pending.

Density is calm and generous: a 1380px container for the nav and the home first viewport, 1280px elsewhere, 16 to 20px phone gutters and 32px from `sm`, sections opened by 80 to 96px of air, headlines heavy and tightly tracked, body copy in a single modern sans. Motion is soft and short, on one brand curve, and every moving piece has a reduced-motion exit.

**Key Characteristics:**
- Warm ivory ground (`ivory-bg`) with white cards and hairline borders; flat, tonal layering, shadows only on floating layers.
- One filled action colour (amber) with a dark brown label; the ink pill is the second, quieter action; pills everywhere a person can act.
- Consent states carry their own colour pair (green or brick, each with a soft tint and a dark "on" ink).
- Instrument Sans for everything, weights 400 to 700; Geist Mono only for live registry counts and small technical labels.
- Real, watermarked photography: registry portraits in 3:4 tiles and real certified shots; no stock imagery, no illustration.
- Dark islands (`data-theme="dark"`) as the only way to go dark inside a light page, now used below the fold only.

## Colors

A low-chroma warm neutral family carries the page; amber is the only saturated colour used for action, and the state colours are reserved for consent.

### Primary
- **Registry Amber** (`amber`): the single filled action colour. Primary buttons, the creator's door, the "Ok" of the cookie bar, the account initial disc, the 2px scroll progress thread, the nav underline, focus outlines, list markers in prose. Always paired with **Deep Brown Label** (`on-amber`) for text on it, never white.
- **Pressed Amber** (`amber-hover`): hover state of filled amber.
- **Burnt Amber Ink** (`amber-ink`): amber as text on ivory, where plain amber would fail contrast: links in prose, outline-button labels. In islands it becomes **Island Amber Ink** (`island-amber-ink`).
- **Amber Wash** (`amber-soft`): tinted background behind amber badges and pills.

### Secondary (consent states)
- **Consent Green** (`verified`) with **Green Wash** (`verified-soft`) and **Green Ink** (`on-verified`): consent active, identity verified, "sempre attivi" in the cookie panel, the chip dot on every portrait tile, the person's share next to a price on the passport.
- **Consent Leaf** (`consent-pill`) with **Leaf Ink** (`on-consent-pill`): the larger "consenso attivo" pill in the person's door (CSS `--consenso-pill`, `--on-consenso-pill`). In the dark theme it becomes sage at 18% with **Island Leaf Ink** (`island-on-consent-pill`).
- **Revoked Brick** (`blocked`) with **Brick Wash** (`blocked-soft`) and **Brick Ink** (`on-blocked`): revoked consent, blocked requests, the unread counter on the account pill (with white text).

### Neutral
- **Ivory Page** (`ivory-bg`): the page background, the browser `theme-color`, and the text colour on the ink button and the cookie bar.
- **Paper White** (`surface`): cards, the creator's door, dropdowns, drawer, cookie preferences panel.
- **Rose Paper** (`person-panel`, CSS `--pannello-persona`): the person's door on the home. In the dark theme it resolves to Night Raised.
- **Warm Edge** (`edge`): the stronger border, used on secondary buttons.
- **Hairline** (`hairline`) and **Soft Hairline** (`hairline-soft`): card borders, dividers, nav bottom rule, the well behind the certified shot, hover fill of menu rows.
- **Ink** (`ink`), **Muted Ink** (`ink-muted`), **Faint Ink** (`ink-faint`): text at three strengths. Muted for leads and nav items, faint for captions and menu headings. Ink is also a fill: the ink button and the cookie bar.
- **Portrait Well** (`portrait-well`): the placeholder behind a portrait before it loads.

### Islands (dark theme values)
Inside `data-theme="dark"` the same variable names resolve to **Night** (`island-bg`), **Night Surface** (`island-surface`), **Night Raised** (`island-elevated`), **Night Edge** (`island-edge`) and **Warm Cream** (`island-text`); muted and faint text are cream at 66% and 42%, hairlines cream at 14% and 7%. States become **Sage** (`island-verified`) and **Coral** (`island-blocked`). Amber and the button "on" inks stay constant across themes.

### Named Rules
**The One Filled Colour Rule.** Amber is the only colour a button is ever filled with, apart from the ink button. Gradients (`--grad-tramonto`, `--grad-aurora`, `--grad-fiducia`) exist for section backgrounds only and never touch a button (stated in `lib/ui.ts`).

**The Two Doors Rule.** Where the page speaks to both audiences at once, the creator's action is amber and the person's action is ink, at the same size (56px pills, full width of their panel). Neither door is ever secondary.

**The Token-Only Rule.** Components read colours through the theme variables (`var(--bg)`, `var(--pannello-persona)`, Tailwind `bg-surface`, `text-muted`, `lib/ui.ts` `colors.*`), never through hex literals, so the same component works on the ivory page and inside an island.

**The Consent Colour Rule.** Green and brick mean consent state and nothing else. They are not decoration and not a second accent.

## Typography

**Display Font:** Instrument Sans (next/font, variable `--font-instrument`, weights 400, 500, 600, 700; fallback system-ui, sans-serif)
**Body Font:** Instrument Sans
**Label/Mono Font:** Geist Mono (next/font, variable `--font-geist-mono`)

**Character:** one contemporary grotesque does all the talking, heavy and tightly tracked at display sizes, plain at reading sizes. The mono appears only where a count or a technical tag should look measured.

### Hierarchy
- **Display** (700, 2.6rem phone, 3.8rem `sm`, 4.9rem `lg`, line-height 1.02, tracking -0.04em, `text-wrap: balance`, centred): the one home headline, "Ogni volto qui ha detto sì.".
- **Display, short screens** (700, `clamp(2.9rem, 6.6vh, 4.9rem)`): the same headline on screens at least 1024px wide and at most 880px tall, so both doors stay whole in the first viewport.
- **Headline** (700, 2.1rem phone, 3.25rem `sm`, line-height 1, tracking -0.035em): section titles via `SectionTitle`.
- **Page title** (700, 2.4rem to 2.6rem phone, 3rem to 3.75rem `sm`, line-height 1 to 1.02, tracking -0.035em to -0.04em): the h1 of inner pages (catalogue 3.5rem, prices 3.75rem, passport 3rem).
- **Price** (600, 2.9rem phone, 3.4rem `sm`, line-height 1, tracking -0.03em, tabular figures): the real price of the shot in the creator's door.
- **Panel name** (600, 1.9rem, tracking -0.02em): the person's name in her door, a link to her passport.
- **Title** (700, 1.3rem, line-height 1.25, tracking -0.02em): card and step titles.
- **Lead, large** (400, 1.1rem phone, 1.3rem `sm`, 1.12rem on short screens, muted ink, 46ch, `text-wrap: pretty`): the line under the home headline.
- **Panel line** (400, 1.08rem phone, 1.3rem `sm`, key words in 600): the three lines of the person's door, each led by a 28px outline icon at stroke 1.6.
- **Lead** (400, 1.05rem to 1.15rem, line-height 1.625, muted ink, 44ch to 54ch, `text-wrap: pretty`): the sentence under a section headline.
- **Body** (400, 1rem, line-height 1.5). Long-form articles use `.prose-semblic`: 1.02rem, line-height 1.78, muted ink, h2 1.45rem, h3 1.15rem.
- **Nav link** (500, 0.98rem, muted ink; the active route 600 in ink).
- **Label, large** (600, 1.1rem): the two door actions.
- **Label** (600, 0.92rem on medium buttons, 0.95rem on the nav pills, 0.82rem small, 0.98rem large, tracking 0.01em, sentence case): button and control labels.
- **Numeral** (Geist Mono 600, 1.5rem phone, 1.7rem `sm`, tabular figures): live registry counts.

### Named Rules
**The Tight Heavy Head Rule.** Anything at headline size or above is weight 700 with negative tracking between -0.035em and -0.04em and line-height at or under 1.02. Reading text is never tracked. The price is the one large figure at 600 with -0.03em.

**The Measured Numbers Rule.** Every figure that comes from the database is set with tabular figures, so a changing number does not jitter: registry counts in Geist Mono, prices and earnings in Instrument Sans `tabular-nums`.

**The Ramp Rule.** Home sizes 2.6rem, 3.8rem, 4.9rem, 3.4rem, 1.9rem, 1.3rem and 1.1rem are intentional steps of the ramp above, not one-offs; new sizes join the ramp here before they ship.

## Layout

The nav and the home first viewport sit in a 1380px container; inner pages keep the 1280px container (`max-w-7xl`, the most used width) with 20px side gutters on phones and 32px from 640px. Narrower reading columns use 768px (`max-w-3xl`) and 1024px (`max-w-5xl`). Sections on the home page open with 80px of top space, 96px from 640px. Card grids use a 16px gap; the registry grid is 3 columns from 640px and 4 from 1024px.

**The two doors.** A centred headline block (max 896px) over two equal columns from 1024px with a 20px gap; each door is a flex column whose action sits at the bottom, so both actions align. The certified shot is 3:2 (2:1 on short screens) with 14px corners inside the white door; the person's portrait is 104 by 124px on phones and 161 by 190px from `sm`, 14px corners. Below 1024px the doors become a sideways row: each door 86% of the width (62% from `sm`), scroll-snap to the start, the second door peeking at the right edge, the row bleeding to the screen edge with a 16px scroll padding.

On phones, long lists do not stack into endless columns: `.riga-scorrevole` turns a grid into a horizontal, snap-aligned row with a 12px gap and hidden scrollbar (below 640px only).

**Passport.** From 1024px a two-column grid (portrait column up to 420px, 32px gap); the portrait column is sticky at 96px from the top, which works because the page wrapper uses `overflow-x: clip` instead of `hidden`. The price sits in one small muted line under the "Crea con" action, with the person's share in green. On phones the action moves into a fixed bottom buy bar (price on the left, 52px amber pill on the right, safe-area padding).

The main nav is sticky, 76px tall (4.75rem), shrinking to 57.6px (3.6rem) after 24px of scroll. Full desktop navigation appears from 1280px (`xl`); below that a hamburger opens a right-hand drawer (82% width, max 320px).

Breakpoints are Tailwind's defaults as used: 640px, 1024px, 1280px, plus 720px for nav padding and the short-screen rule (min-width 1024px and max-height 880px).

## Elevation & Depth

The system is flat at rest. Depth comes from tonal layering: ivory page, white or rose-paper panel, hairline border. Shadows exist only on things that float above the page or over a photo (sticky nav once scrolled, dropdowns, drawer, cookie bar and panel, the certificate pill on the shot) and they are soft and warm, tinted with the ink colour rather than black. Dark islands add depth by contrast, not by shadow.

### Shadow Vocabulary
- **Nav settled** (`box-shadow: 0 10px 30px -22px rgba(23,21,15,0.35)`): the sticky header after scrolling.
- **Floating panel** (`box-shadow: 0 24px 60px -30px rgba(23,21,15,0.35)`): nav dropdowns. The cookie preferences panel uses the same shape at `-24px` spread.
- **Cookie bar** (`box-shadow: 0 18px 40px -20px rgba(23,21,15,0.55)`): the one-line ink bar.
- **Photo pill** (`box-shadow: 0 2px 10px rgba(23,21,15,0.12)`): the white "Certificato SEMBLIC" pill set on the certified shot.
- **Drawer** (`box-shadow: -20px 0 60px rgba(23,21,15,0.18)`): the mobile menu.

### Named Rules
**The Flat-By-Default Rule.** Cards, doors and tiles carry a hairline border or a tonal fill and no shadow. A shadow means the layer is floating over content.

**The Frosted Bars Rule.** Glass is for fixed bars only: the sticky header (ivory at 78%, 94% once scrolled, strong backdrop blur) and the passport's phone buy bar (ivory at 94%, medium blur); the cookie preferences panel is the one frosted floating card.

## Shapes

Soft, friendly geometry. Anything a person presses is a full pill (`rounded-full` is by far the most used radius). Containers step up in radius with their size: 10 to 12px for small controls and menu rows, 14px for photos inside a panel, 16px for panels, dialogs and the cookie bar, 18px for portrait tiles, 20px for cards and doors, 28px for islands. Portraits are 3:4 and clipped by their radius; inside a card that already has corners the tile drops its own radius. Borders are always 1px hairlines; the person's door has no border, its fill is enough.

## Components

### Buttons
Confident pills, one filled colour, sentence-case labels.
- **Shape:** full pill (9999px).
- **Primary:** amber fill, deep brown label, weight 600. Sizes: small 36px tall with 16px side padding, medium 44px with 24px, large 52px with 32px.
- **Hover / Focus:** fill shifts to pressed amber over 200ms; press scales to 0.98; keyboard focus shows a 2px amber ring at 60% with a 2px offset in the page colour.
- **Secondary:** transparent with a 1px warm edge border and ink label; the border warms to amber at 70% on hover. "Accedi" in the nav, 44px with 20px padding and a 0.95rem label.
- **Ink:** ink fill with ivory label, hover to 90% opacity. "Registrati" in the nav (44px, 20px padding, 0.95rem) and the person's door action.
- **Door actions:** 56px, full width of the door, 1.1rem label, 24px side padding. Amber for "Crea con volti veri", ink for "Metti il tuo volto" (hover lifts 1px); both press to 0.98 with a 3px-offset amber focus outline.
- **Outline:** transparent, amber border at 50%, burnt amber label. Rare.
- **Ghost:** muted ink text that darkens on hover.

### Chips
- **Consent chip on portraits:** white at 92% over the photo with green ink and a 6px green dot ("Verificato", "Verificata"); revoked uses brick wash, brick ink and a brick dot ("Revocato").
- **Consent pill in the person's door:** leaf fill, leaf ink, 36px tall, 14px side padding, 1.05rem at 500, a 10px green dot, "consenso attivo".
- **Certificate pill on a shot:** white at 95% with ink text, 40px tall, 16px side padding, 0.9rem at 600, photo-pill shadow, lifts 1px on hover; it links to Sigil.
- **Status pills (`lib/ui.ts` `pill()`):** soft wash background, 45% tinted border, 600 weight, full pill, 4px by 12px padding.

### Cards / Containers
- **Corner Style:** 20px (`.card`); inline-style cards from `lib/ui.ts` use 18px.
- **Background:** paper white on ivory.
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** 1px hairline.
- **Internal Padding:** 24px.

### The Two Doors (signature)
The home first viewport (`DuePorte`). Two equal 20px panels, 20px padding on phones and 28px from `sm`. The creator's door is paper white with a hairline border: the real certified shot, the format and quality in muted 1.05rem, the price, the amber action. The person's door is rose paper with no border: her portrait, name and consent pill, three lines (what she received for this shot, revocation that works at once, her own limits), the ink action. Every value comes from the database; with no shot in the showcase the doors stay, with a plain sentence instead of photo and numbers. One entrance motion only, **porta-sale**: both doors rise 18px over 900ms on the brand curve, the second 80ms later, transform only so the photo paints at once; none under reduced motion.

### Navigation
- **Style:** sticky frosted ivory bar, 1px hairline bottom, 2px amber scroll-progress thread along the top edge, 1380px container. Logo mark plus the wordmark "SEMBLIC" in 700 at 0.875rem with 0.2em tracking.
- **Items:** Registro, Crea (menu), Proteggi (menu, with a "Fiducia" heading over the trust pages), Prezzi, Academy. 0.98rem, 500, muted ink; on hover the text darkens and a 1px amber underline grows from the left (300ms, brand curve). The active direct route is ink at 600 with `aria-current="page"`. Menus open on hover and keyboard focus as a white card with a floating shadow.
- **Actions:** a hairline divider separates navigation from actions. Signed out: theme toggle, 44px "Accedi" (secondary) and 44px "Registrati" (ink). Signed in: VOLT balance, account pill (amber initial disc), theme toggle, 44px amber "Crea".
- **Mobile:** hamburger opens a right drawer that slides in on a spring (damping 30, stiffness 300) over a 30% black scrim; sections are accordions; a full-width large button closes the drawer ("Registrati" in ink when signed out).

### Cookie Notice
A one-line ink bar floating 12px above the bottom edge (max 512px wide, 16px corners): "Solo cookie essenziali, niente profilazione." in ivory at 0.9rem, a "Dettagli" underlined link, and a 44px amber "Ok". The full preferences panel (paper white at 95%, frosted, two equal-weight pill buttons) opens only from the /cookie page.

### Avatar Tile (signature)
The unit of the registry: a 3:4 real, watermarked portrait with 18px corners, the consent chip at top left, the person's name bottom left in white 600 over a 55% black gradient. On hover the photo scales to 1.04 over 700ms on the brand curve. The portrait carries a view-transition name so it travels into the passport page.

### Island
A section with `data-theme="dark"`: night background, cream text, 28px corners, 64px inner padding on large screens, often lit by a single amber radial glow from a corner. Every token inside flips automatically. On the home page today: IlSet (two islands), WardSection, ClosingCTA; the free-try strip (ProvaGratis) is also an island when switched on.

### Motion
- **Brand curve:** `cubic-bezier(0.22, 1, 0.36, 1)` for reveals, underlines, dropdowns, tile zoom and the doors' entrance.
- **Durations:** 200ms controls, 300ms nav underline, 350ms theme change, 500ms nav resize, 550 to 700ms content reveals, 900ms door entrance.
- **Reveals:** fade and rise of 16 to 20px with a 4px blur that resolves, once, started early (18% bottom margin); CSS scroll-driven `.sv` does the same where the browser supports `animation-timeline: view()`, and stays static elsewhere.
- **Smooth scroll:** Lenis (duration 1.1) on mouse devices only; on touch, CSS smooth anchors.
- **Reduced motion:** every animation, reveal, scroll effect and hover lift is switched off under `prefers-reduced-motion: reduce`.

## Direction B (27/9/2026): status

Approved by the owner ("B, luminosa", then "3, le due metà"); the home contract lives in `.impeccable/surfaces/app-page-tsx.md`.
- Built: the light first viewport (the two doors, real photography, no hero video), the nav (Registro, Crea, Proteggi, Prezzi, Academy; Accedi and Registrati), the one-line cookie bar, the passport price and phone buy bar.
- Pending: B asks for light surfaces throughout the home. IlSet, WardSection and ClosingCTA are still dark islands; they are current state, not the target.

## Do's and Don'ts

### Do:
- **Do** build on the theme variables (`var(--bg)`, `var(--surface)`, `var(--text)`, `var(--pannello-persona)`, Tailwind `bg-surface`, `text-muted`, `border-border`) so a component works on the ivory page and inside an island.
- **Do** use amber fill with the deep brown label for the one main action in view; everything else is secondary, ghost or a link. Where both audiences are addressed, pair it with an ink action of the same size.
- **Do** use pills (9999px) for every button, chip and badge, at least 44px tall where a thumb presses them.
- **Do** show consent with the green or brick pair, including the soft wash and the "on" ink, next to every real face.
- **Do** set headlines at 700 with -0.035em to -0.04em tracking and line-height at or under 1.02, and set every database figure with tabular figures.
- **Do** keep cards flat: white, 1px hairline, 20px corners, 24px padding.
- **Do** turn long phone lists into a horizontal snap row (`.riga-scorrevole`, or the doors' 86% columns) instead of a long column.
- **Do** give every animation a reduced-motion exit and use the brand curve `cubic-bezier(0.22, 1, 0.36, 1)`; animate transform, not the photo's paint.

### Don't:
- **Don't** put a gradient on a button; gradients are for section backgrounds only.
- **Don't** set white text on amber; the label on amber is always the deep brown (`on-amber`).
- **Don't** use green or brick as decoration or as a second accent.
- **Don't** use pure white as the page background; the page is ivory, white is for surfaces on it.
- **Don't** hard-code hex values in components; the legacy literal `#F2A93B` (glows, selection, 34 uses), the dot `#2E9E44` in the consent pill and the certificate pill's `#17150F` are not tokens and are not a pattern to extend.
- **Don't** add shadows to cards, doors or tiles at rest.
- **Don't** set any text below 12px. The current mono section label (`.kicker`, 0.6875rem uppercase with 0.18em tracking, 61 files), its 0.52rem account variant in the nav and the 0.58rem to 0.62rem chips and badges are carried by the build, below that floor, and are not a pattern to extend.
