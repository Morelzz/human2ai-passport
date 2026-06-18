# Piano A: Studio di generazione (redesign /match) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il pannello di generazione di `/match` con il nuovo Studio premium (Cowork), aggiungere i campi fotografici (macchina, ottica, luce, stile colore, inquadratura, espressione) e le pose categorizzate al prompt ECHO via whitelist server, mantenendo invariati consenso, royalty, certificato, VOLT e l'identity-lock. ECHO resta l'unico motore (riverifica "solo ECHO").

**Architecture:** Una sorgente di verita unica e pura (`lib/studio-options.ts`) tiene cataloghi e token inglesi (camera, lens, light, colorStyle, framing, expression, pose categorizzate, preset obiettivo), importata sia dal client (per il picker e l'anteprima "prompt finale") sia dal server (per la whitelist). Il prompt builder duplicato (route.ts + echo-job.ts) viene estratto in un modulo condiviso (`lib/echo-prompt.ts`) e riceve un nuovo segmento "Photographed as: ...". I campi viaggiano nel body di `/api/generate`, vengono validati su whitelist, composti nel segmento e propagati al worker async via `EchoJobParams`. Le colonne nuove su `generations` sono persistite con lo stesso pattern best-effort gia usato per `tier`/`engine_cost_cents` (non si rompe nulla prima della migrazione).

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind + Supabase + sharp. Motore ECHO (gpt-image-2). Nessuna nuova dipendenza per il Piano A (sharp serve all'Editor, Piano B).

---

## Nota di fedelta UI (NON e un segnaposto)

La spec (`docs/SEMBLIC_STUDIO_EDITOR_BUILD_SPEC.md`, sezione 0) designa i prototipi HTML in `design/` come **fonte di verita per la UI**: "dove questo documento e i file design divergono, vince il file design per la UI". Quindi per i task di interfaccia il markup va **portato fedelmente dai file design nominati** (classi, struttura, etichette esatte, palette), non reinventato. Questo piano fornisce per ogni task UI: il file design di riferimento, lo stato/handler React, il catalogo consumato (token esatti), la logica non ovvia (composizione prompt, bottom sheet, scroll fade) e i passi di verifica. La verifica della fedelta avviene a runtime contro il prototipo (preview MCP), non riproducendo 600 righe di JSX in questo documento.

File design canonici:
- `design/anteprima_match_mobile.html` (studio, mobile, CANONICO)
- `design/anteprima_match_studio_redesign.html` (studio, desktop a due colonne)

## Ambiente e verifica (questo progetto)

- Niente runner di test per TypeScript nel repo: la verifica e `npx tsc --noEmit`, `npm run build`, e controlli a runtime via preview MCP (`preview_start "dev"`, poi `preview_eval`/`preview_snapshot` su `localhost:3000`). Lo screenshot va in timeout su pagine animate: misurare via `preview_eval`.
- Login preview (seller): `test-card-e3@h2ai.dev` / `H2ai-test-2026!` (native-setter + `form.requestSubmit`).
- Le migrazioni su prod le applica Morelz nella SQL Editor (apply_migration e gated). Mostrare sempre l'SQL prima, verificare lo schema dopo con `execute_sql`.
- Commit in italiano, niente trattini lunghi, trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Push SOLO a "pubblica".

## File Structure

- **Create** `lib/studio-options.ts` — puro, importabile client+server. Cataloghi + token + tipi + `photographicSegment()` + validatori + preset obiettivo + pose categorizzate.
- **Create** `lib/echo-prompt.ts` — `buildEchoPrompt` + `clauseForExtra` (estratti dalle due copie), con nuovo parametro `photographic`.
- **Modify** `app/api/generate/route.ts` — importa il builder condiviso; parsa e valida i nuovi enum; risolve la posa (enum nuovo, fallback `poseId`); compone il segmento; lo mette in `EchoJobParams`; persiste gli enum best-effort.
- **Modify** `lib/echo-job.ts` — importa il builder condiviso; `EchoJobParams` guadagna `photographic` + enum grezzi; il worker passa `photographic` a `buildEchoPrompt` e persiste gli enum best-effort.
- **Create** `supabase/studio_photographic_fields.sql` — migrazione additiva (Morelz applica).
- **Modify** `app/match/MatchClient.tsx` — redesign del pannello di generazione (consuma `lib/studio-options.ts`).
- **Create** `app/match/studio/` — sottocomponenti dello Studio (GoalStart, AvatarHero, ScenePrompt, PosePicker, IconPicker, ColorStyleRow, PhotographicLook, ReferenceImages, EngineFormat, FinalPrompt, GenerateBar) per tenere i file focalizzati.

---

# FASE 1 — Catalogo condiviso + backend

### Task 1: `lib/studio-options.ts` (sorgente di verita unica)

**Files:**
- Create: `lib/studio-options.ts`

- [ ] **Step 1: Scrivere il modulo completo**

Token presi da `SEMBLIC_STUDIO_EDITOR_BUILD_SPEC.md` sezioni 3.5-3.9 e 3.12 (canoniche per il backend). `photographicSegment` segue il template della sezione 3.12: `Photographed as: <stile colore>, <inquadratura>, <espressione>, <macchina>, <ottica>, <luce>.` (solo i token non vuoti, in quest'ordine).

```typescript
// lib/studio-options.ts
// ──────────────────────────────────────────────────────────────────────────
// Studio di generazione: cataloghi e token. SORGENTE DI VERITA UNICA, pura,
// importata sia dal client (picker + anteprima prompt) sia dal server
// (whitelist: mai testo libero del client come parametro fotografico).
// Nessun import di runtime client/server: solo dati e funzioni pure.
// ──────────────────────────────────────────────────────────────────────────

export interface Opt { v: string; l: string; token: string }
export interface PoseOpt extends Opt { cat: string }

// 3.9 Macchina
export const CAMERAS: Opt[] = [
  { v: "analogica", l: "Analogica", token: "shot on 35mm film, natural grain, warm tones" },
  { v: "full_frame", l: "Full frame", token: "full-frame digital, sharp, wide dynamic range" },
  { v: "medio_formato", l: "Medio formato", token: "medium format, extreme detail, smooth bokeh" },
  { v: "polaroid", l: "Polaroid", token: "instant Polaroid photo, white frame, vintage tones" },
];

// 3.9 Ottica (etichette coi mm)
export const LENSES: Opt[] = [
  { v: "8mm", l: "8mm", token: "8mm fisheye, ultra wide-angle" },
  { v: "12mm", l: "12mm", token: "12mm ultra wide-angle" },
  { v: "20mm", l: "20mm", token: "20mm wide-angle" },
  { v: "35mm", l: "35mm", token: "35mm reportage perspective" },
  { v: "50mm", l: "50mm", token: "50mm natural perspective" },
  { v: "85mm", l: "85mm", token: "85mm portrait lens, creamy bokeh, shallow depth of field" },
  { v: "200mm", l: "200mm", token: "200mm telephoto, compressed perspective" },
];

// 3.9 Luce
export const LIGHTS: Opt[] = [
  { v: "naturale", l: "Naturale", token: "natural light" },
  { v: "golden", l: "Golden hour", token: "golden hour warm light" },
  { v: "studio", l: "Studio", token: "studio softbox lighting" },
  { v: "controluce", l: "Controluce", token: "backlight, rim light" },
  { v: "neon", l: "Neon", token: "nighttime neon lighting" },
];

// 3.8 Stile colore (in generazione)
export const COLOR_STYLES: Opt[] = [
  { v: "naturale", l: "Naturale", token: "" },
  { v: "bn", l: "Bianco e nero", token: "black and white photography" },
  { v: "pastello", l: "Colori pastello", token: "soft pastel color palette" },
  { v: "cinematico", l: "Cinematico", token: "cinematic teal and orange color grading" },
  { v: "contrasto", l: "Contrasto forte", token: "high contrast, deep shadows" },
  { v: "flash", l: "Effetto flash", token: "direct on-camera flash, harsh flash look" },
];

// 3.6 Inquadratura
export const FRAMINGS: Opt[] = [
  { v: "primo_piano", l: "Primo piano", token: "close-up portrait, head and shoulders" },
  { v: "mezzo_busto", l: "Mezzo busto", token: "medium shot, waist up" },
  { v: "figura_intera", l: "Figura intera", token: "full-body shot" },
  { v: "americano", l: "Piano americano", token: "American shot, from the knees up" },
];

// 3.7 Espressione
export const EXPRESSIONS: Opt[] = [
  { v: "naturale", l: "Naturale", token: "" },
  { v: "sorriso", l: "Sorriso", token: "natural smile" },
  { v: "serio", l: "Serio", token: "serious expression" },
  { v: "pensieroso", l: "Pensieroso", token: "thoughtful expression" },
  { v: "risata", l: "Risata", token: "candid laughter" },
];

// 3.5 Pose categorizzate (token diretti, niente bucket: scelta "lista statica").
export const POSES: PoseOpt[] = [
  { v: "nessuna", l: "Nessuna", token: "", cat: "Base" },
  { v: "casuale", l: "Casuale", token: "dynamic natural pose", cat: "Base" },
  { v: "in_piedi", l: "In piedi", token: "standing straight facing the camera", cat: "In piedi" },
  { v: "tre_quarti", l: "Tre quarti", token: "three-quarter turn", cat: "In piedi" },
  { v: "mani_tasca", l: "Mani in tasca", token: "hands in trouser pockets", cat: "In piedi" },
  { v: "mani_fianchi", l: "Mani sui fianchi", token: "hands on hips, power pose", cat: "In piedi" },
  { v: "braccia_conserte", l: "Braccia conserte", token: "arms crossed over the chest", cat: "In piedi" },
  { v: "mano_mento", l: "Mano al mento", token: "hand on the chin, thoughtful", cat: "In piedi" },
  { v: "al_muro", l: "Al muro", token: "leaning against a wall", cat: "In piedi" },
  { v: "profilo", l: "Profilo", token: "full side profile", cat: "In piedi" },
  { v: "braccia_aperte", l: "Braccia aperte", token: "arms open wide", cat: "In piedi" },
  { v: "sgabello", l: "Su sgabello", token: "sitting on a tall stool", cat: "Seduta" },
  { v: "a_terra", l: "A terra", token: "sitting on the floor, knee up", cat: "Seduta" },
  { v: "camminata", l: "Camminata", token: "captured mid-stride walking", cat: "Dinamica" },
  { v: "di_spalle", l: "Di spalle", token: "seen from behind, looking over the shoulder", cat: "Editoriale" },
  { v: "prodotto_mano", l: "Prodotto in mano", token: "presenting a product held in one hand", cat: "Editoriale" },
];

// 3.2 Preset "Avvio per obiettivo". format mappa su ECHO_FORMATS (quadrato/verticale/orizzontale).
export interface GoalPreset {
  v: string; l: string;
  format?: string; res?: string;
  framing?: string; light?: string; colorStyle?: string; lens?: string;
}
export const GOALS: GoalPreset[] = [
  { v: "ig", l: "Post Instagram", format: "verticale", framing: "mezzo_busto", light: "naturale", colorStyle: "naturale", lens: "50mm" },
  { v: "ecom", l: "Foto prodotto", format: "quadrato", framing: "figura_intera", light: "studio", colorStyle: "naturale", lens: "50mm" },
  { v: "linkedin", l: "Ritratto LinkedIn", format: "verticale", framing: "primo_piano", light: "studio", colorStyle: "naturale", lens: "85mm" },
  { v: "adv", l: "Banner ADV", format: "orizzontale", framing: "figura_intera", light: "golden", colorStyle: "cinematico", lens: "35mm" },
  { v: "libera", l: "Scena libera" },
];

// ── Whitelist helpers ───────────────────────────────────────────────────────
function tokenOf(list: Opt[], v: unknown): string {
  if (typeof v !== "string") return "";
  return list.find((o) => o.v === v)?.token ?? "";
}
export const cameraToken = (v: unknown) => tokenOf(CAMERAS, v);
export const lensToken = (v: unknown) => tokenOf(LENSES, v);
export const lightToken = (v: unknown) => tokenOf(LIGHTS, v);
export const colorStyleToken = (v: unknown) => tokenOf(COLOR_STYLES, v);
export const framingToken = (v: unknown) => tokenOf(FRAMINGS, v);
export const expressionToken = (v: unknown) => tokenOf(EXPRESSIONS, v);
export const poseToken = (v: unknown) => tokenOf(POSES as Opt[], v);

export interface PhotographicChoice {
  camera?: unknown; lens?: unknown; light?: unknown;
  colorStyle?: unknown; framing?: unknown; expression?: unknown;
}

// Segmento fotografico: "Photographed as: <stile colore>, <inquadratura>,
// <espressione>, <macchina>, <ottica>, <luce>." (solo token non vuoti, 3.12).
// Stringa vuota se nessun token: il chiamante non aggiunge nulla al prompt.
export function photographicSegment(c: PhotographicChoice): string {
  const toks = [
    colorStyleToken(c.colorStyle),
    framingToken(c.framing),
    expressionToken(c.expression),
    cameraToken(c.camera),
    lensToken(c.lens),
    lightToken(c.light),
  ].filter(Boolean);
  return toks.length ? `Photographed as: ${toks.join(", ")}.` : "";
}

// Solo i valori validi (per la persistenza DB: scartiamo input ignoti).
export function validEnum(list: Opt[], v: unknown): string | null {
  return typeof v === "string" && list.some((o) => o.v === v) ? v : null;
}
```

- [ ] **Step 2: Verificare i tipi**

Run: `npx tsc --noEmit`
Expected: PASS (nessun errore introdotto da `lib/studio-options.ts`).

- [ ] **Step 3: Commit**

```bash
git add lib/studio-options.ts
git commit -F .git/COMMIT_EDITMSG   # messaggio: "Studio: catalogo unico opzioni fotografiche e pose"
```
(Usare `git commit -F file` con il messaggio in italiano: lezione PowerShell, le doppie virgolette nelle here-string spezzano gli argomenti.)

---

### Task 2: Estrarre il prompt builder condiviso (`lib/echo-prompt.ts`) con segmento fotografico

**Contesto:** `buildEchoPrompt` e `clauseForExtra` sono DUPLICATI identici in `app/api/generate/route.ts:31-63` e `lib/echo-job.ts:135-169`. Li estraiamo in un modulo unico e aggiungiamo il parametro `photographic`. Il percorso commerciale reale e l'async (echo-job.ts): senza questo, il segmento non arriverebbe all'output.

**Files:**
- Create: `lib/echo-prompt.ts`
- Modify: `lib/echo-job.ts:135-169` (rimuovere le copie, importare)
- Modify: `app/api/generate/route.ts:26-63` (rimuovere le copie, importare)

- [ ] **Step 1: Creare `lib/echo-prompt.ts`**

```typescript
// lib/echo-prompt.ts
// ──────────────────────────────────────────────────────────────────────────
// Composizione del prompt finale ECHO. SORGENTE UNICA (prima duplicata tra
// app/api/generate/route.ts e lib/echo-job.ts). SERVER-ONLY ok ma puro: nessun
// import esterno. L'identita e garantita dalle reference, non dalle parole.
// ──────────────────────────────────────────────────────────────────────────

export type ExtraMeta = { role: string; desc: string };

export function clauseForExtra(e: ExtraMeta): string {
  const d = e.desc.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  switch (e.role) {
    case "outfit":
      return `the person is wearing the ${d || "outfit"} shown in the additional reference images`;
    case "accessorio":
      return `the person is wearing or using the ${d || "accessory"} shown in the additional reference images`;
    case "sfondo":
      return `the scene takes place in the ${d || "location"} shown in the additional reference images, used as the background and environment`;
    default:
      return `the image includes the ${d || "object"} shown in the additional reference images`;
  }
}

// Ordine: identita -> posa -> extra (clausole) -> segmento fotografico -> scena.
// `photographic` arriva gia composto da lib/studio-options.photographicSegment
// (whitelist server), oppure stringa vuota.
export function buildEchoPrompt(
  scene: string,
  extras: ExtraMeta[],
  poseText?: string | null,
  identityText?: string | null,
  photographic?: string | null
): string {
  const safe = scene.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
  let base =
    "Photorealistic image that preserves the exact facial identity, hair and distinctive features of the same real person shown in the reference photographs. Natural, true-to-life skin and proportions, high-quality commercial photography.";
  if (identityText) base += ` ${identityText}`;
  if (poseText) base += ` The person's body pose: ${poseText}.`;
  const clauses = extras.map(clauseForExtra);
  if (clauses.length > 0) {
    base += " " + clauses.join("; ") + ". Apply each one faithfully and exactly as depicted.";
  }
  if (photographic) base += ` ${photographic}`;
  return safe ? `${base} Additional direction: ${safe}.` : base;
}
```

- [ ] **Step 2: Aggiornare `lib/echo-job.ts`**

Rimuovere `type ExtraMeta`, `clauseForExtra`, `buildEchoPrompt` (righe 135-169). Aggiungere in cima (vicino agli altri import):

```typescript
import { buildEchoPrompt, type ExtraMeta } from "@/lib/echo-prompt";
```

- [ ] **Step 3: Aggiornare `app/api/generate/route.ts`**

Rimuovere `type ExtraMeta`, `clauseForExtra`, `buildEchoPrompt` (righe 29-63). Aggiungere agli import:

```typescript
import { buildEchoPrompt, type ExtraMeta } from "@/lib/echo-prompt";
```

- [ ] **Step 4: Verificare tipi e build (comportamento invariato a questo punto)**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS. Il prompt e identico a prima (photographic ancora non passato): nessuna regressione.

- [ ] **Step 5: Commit**

```bash
git add lib/echo-prompt.ts lib/echo-job.ts app/api/generate/route.ts
git commit -F <file>   # "Echo: estratto buildEchoPrompt in modulo unico con segmento fotografico"
```

---

### Task 3: Wiring server in `/api/generate/route.ts` (whitelist + segmento + pose enum + persistenza)

**Files:**
- Modify: `app/api/generate/route.ts`

- [ ] **Step 1: Import del catalogo**

```typescript
import { photographicSegment, poseToken, validEnum, CAMERAS, LENSES, LIGHTS, COLOR_STYLES, FRAMINGS, EXPRESSIONS } from "@/lib/studio-options";
```

- [ ] **Step 2: Parsare e validare i nuovi enum + comporre il segmento (dopo il blocco echoSize/echoQuality, ~riga 145)**

```typescript
// Parametri fotografici: tutti opzionali, validati su whitelist (mai testo
// libero del client come parametro). Ignorati se ignoti.
const photo = {
  camera: validEnum(CAMERAS, body?.camera),
  lens: validEnum(LENSES, body?.lens),
  light: validEnum(LIGHTS, body?.light),
  colorStyle: validEnum(COLOR_STYLES, body?.colorStyle),
  framing: validEnum(FRAMINGS, body?.framing),
  expression: validEnum(EXPRESSIONS, body?.expression),
};
const photographic = photographicSegment(photo);
```

- [ ] **Step 3: Risolvere la posa dal nuovo enum, con fallback al vecchio `poseId` (sostituire il blocco righe 152-158)**

```typescript
// Posa: nuovo flusso = enum `pose` tradotto dalla whitelist (lib/studio-options).
// Fallback retrocompatibile: vecchio `poseId` dalla libreria su storage.
let poseText: string | null = null;
if (useEcho) {
  const pt = poseToken(body?.pose);
  if (pt) {
    poseText = pt;
  } else if (body?.poseId) {
    poseText = await fetchPosePrompt(String(body.poseId));
    if (!poseText) {
      return NextResponse.json({ error: "Posa non trovata nella libreria" }, { status: 400 });
    }
  }
}
```
(Nota: `pose: "nessuna"` o `"casuale"` con token vuoto -> nessuna posa, corretto. `poseToken` ritorna "" per chiavi ignote, quindi nessun blocco erroneo.)

- [ ] **Step 4: Propagare `photographic` + enum grezzi nel job async (oggetto `params`, righe 180-189)**

```typescript
const params = {
  scene,
  category,
  echoSize,
  echoQuality,
  extras,
  poseText,
  identityText,
  photographic,
  photo, // enum grezzi, per la persistenza colonne
  pricing: { gross_cents, fee_cents, royalty_cents: net_cents, surcharge_cents },
};
```

- [ ] **Step 5: Passare `photographic` al builder nel percorso sincrono (riga 285)**

```typescript
const echoResult = await generateEcho({ prompt: buildEchoPrompt(scene, extraMeta, poseText, identityText, photographic), references, size: echoSize, quality: echoQuality });
```

- [ ] **Step 6: Persistere gli enum (best-effort) nel commerciale sincrono (blocco `meta`, righe 424-428)**

```typescript
{
  const meta: Record<string, unknown> = { tier: "ECHO" };
  if (engineCostCents != null) meta.engine_cost_cents = engineCostCents;
  if (photo.camera) meta.camera = photo.camera;
  if (photo.lens) meta.lens = photo.lens;
  if (photo.light) meta.light = photo.light;
  if (photo.colorStyle) meta.color_style = photo.colorStyle;
  if (photo.framing) meta.framing = photo.framing;
  if (photo.expression) meta.expression = photo.expression;
  await admin.from("generations").update(meta).eq("id", genId);
}
```

- [ ] **Step 7: Verificare tipi + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS. (Il tipo di `params` ora include `photographic`/`photo`; il Task 4 allinea `EchoJobParams`.)

- [ ] **Step 8: Commit**

```bash
git add app/api/generate/route.ts
git commit -F <file>   # "Generate: whitelist campi fotografici, segmento prompt, pose enum, persistenza"
```

---

### Task 4: Worker async — propagare e persistere (`lib/echo-job.ts`)

**Files:**
- Modify: `lib/echo-job.ts`

- [ ] **Step 1: Estendere `EchoJobParams` (interfaccia, righe 41-53)**

```typescript
export interface EchoJobParams {
  scene: string;
  category: string | null;
  echoSize: EchoSize;
  echoQuality: EchoQuality;
  extras: EchoExtra[];
  poseText?: string | null;
  identityText?: string | null;
  // Segmento fotografico gia composto all'enqueue (whitelist server).
  photographic?: string | null;
  // Enum grezzi, per persistere le colonne additive su generations.
  photo?: {
    camera?: string | null; lens?: string | null; light?: string | null;
    colorStyle?: string | null; framing?: string | null; expression?: string | null;
  };
  pricing: EchoPricing;
}
```

- [ ] **Step 2: Passare `photographic` al builder nel worker (ciclo generateEcho, riga 281)**

```typescript
result = await generateEcho({
  prompt: buildEchoPrompt(p.scene, extraMeta, p.poseText, p.identityText, p.photographic),
  references,
  size: p.echoSize,
  quality: p.echoQuality,
});
```

- [ ] **Step 3: Persistere gli enum best-effort (blocco `meta`, righe 326-328)**

```typescript
const meta: Record<string, unknown> = { tier: "ECHO" };
if (engineCostCents != null) meta.engine_cost_cents = engineCostCents;
const ph = p.photo;
if (ph?.camera) meta.camera = ph.camera;
if (ph?.lens) meta.lens = ph.lens;
if (ph?.light) meta.light = ph.light;
if (ph?.colorStyle) meta.color_style = ph.colorStyle;
if (ph?.framing) meta.framing = ph.framing;
if (ph?.expression) meta.expression = ph.expression;
await admin.from("generations").update(meta).eq("id", genId);
```

- [ ] **Step 4: Verificare tipi + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/echo-job.ts
git commit -F <file>   # "Echo job: propaga segmento fotografico al worker e persiste gli enum"
```

---

### Task 5: Migrazione additiva `generations` (la applica Morelz)

**Files:**
- Create: `supabase/studio_photographic_fields.sql`

- [ ] **Step 1: Scrivere la migrazione**

```sql
-- Studio: parametri fotografici scelti in generazione (additivi, nessun dato
-- biometrico). best-effort lato codice: l'app gira anche se non applicata.
alter table public.generations
  add column if not exists camera       text,
  add column if not exists lens         text,
  add column if not exists light        text,
  add column if not exists color_style  text,
  add column if not exists framing      text,
  add column if not exists expression   text;
```

- [ ] **Step 2: Mostrare l'SQL a Morelz e chiedere di applicarlo nella Supabase SQL Editor** (apply_migration e gated; ref progetto `ktjebfavzherochwhtis`).

- [ ] **Step 3: Verificare lo schema a terra (dopo l'applicazione di Morelz)**

Con `execute_sql`:
```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='generations'
  and column_name in ('camera','lens','light','color_style','framing','expression')
order by column_name;
```
Expected: 6 righe.

- [ ] **Step 4: Commit del file SQL**

```bash
git add supabase/studio_photographic_fields.sql
git commit -F <file>   # "Migrazione: colonne fotografiche additive su generations"
```

**Checkpoint Fase 1:** il backend accetta e compone i campi fotografici e le pose enum, li persiste senza rompere nulla pre-migrazione, ECHO resta forzato. Verifica E2E reale del segmento rimandata al Task 16 (una generazione ECHO vera, che Morelz fa per ultimo, conferma il segmento nell'output).

---

# FASE 2 — Studio UI (redesign `app/match`)

> Per ogni task UI: portare il markup dal file design citato (fedelta), usare il catalogo `lib/studio-options.ts`, palette SEMBLIC (Obsidian/Lumen/Amber/salvia/coral), bottoni Amber pieni, niente trattini lunghi. Verifica a runtime via preview MCP.

### Task 6: Scaffolding Studio + stato selezioni (mantieni match/VOLT/async/enhancer)

**Files:**
- Modify: `app/match/MatchClient.tsx`
- Create: `app/match/studio/StudioPanel.tsx` (contenitore del nuovo pannello di generazione)

- [ ] **Step 1:** Creare `app/match/studio/StudioPanel.tsx` come componente che riceve l'avatar selezionato (alias, handle, portrait, tier, consenso categoria) + i callback esistenti (`generate`, `enhance`, stato VOLT, gen result) come props da `MatchClient`. Spostare qui il markup di generazione; `MatchClient` resta proprietario di: ricerca match, `selectedHandle`, `genByHandle`, `sceneByHandle`, polling async, `voltGate`. Mantenere `engine = "echo" as const` (riga 225): NESSUN reintroduzione di model/styleId/HUMAN/SHAPE (riverifica solo ECHO).

- [ ] **Step 2:** Aggiungere lo stato delle nuove selezioni (in `StudioPanel` o sollevato in `MatchClient`, una per handle se serve persistere tra avatar):

```typescript
const [goal, setGoal] = useState<string | null>(null);
const [pose, setPose] = useState("nessuna");
const [framing, setFraming] = useState("mezzo_busto");
const [expression, setExpression] = useState("naturale");
const [colorStyle, setColorStyle] = useState("naturale");
const [camera, setCamera] = useState("full_frame");
const [lens, setLens] = useState("85mm");
const [light, setLight] = useState("naturale");
// echoFormat/echoRes/echoQuality/echoRefs restano come oggi.
```

- [ ] **Step 3:** Verifica: `npx tsc --noEmit && npm run build` PASS; preview: `/match` carica, ricerca e selezione avatar funzionano come prima (nessuna regressione di flusso). Commit.

### Task 7: Avvio per obiettivo ("Cosa vuoi creare")

**Files:** Create `app/match/studio/GoalStart.tsx`; Modify `StudioPanel.tsx`.
Design: `design/anteprima_match_mobile.html` sezione `.start` / `.goals` (righe ~216-229, JS `applyGoal` ~468-480).

- [ ] **Step 1:** Schermata iniziale con i 5 riquadri da `GOALS` (`lib/studio-options.ts`). "Scena libera" full-width tratteggiata salta i preset.
- [ ] **Step 2:** `applyGoal(g)`: imposta `echoFormat`, `framing`, `light`, `colorStyle`, `lens` dal preset (campi presenti), poi nasconde la schermata e mostra la composizione. Pillola obiettivo con "x" per reset (riapre la schermata).
- [ ] **Step 3:** Verifica preview: scelgo "Ritratto LinkedIn" -> formato Verticale, inquadratura Primo piano, ottica 85mm, luce Studio risultano preselezionati nei controlli sotto. Commit.

### Task 8: Avatar hero card

**Files:** Create `app/match/studio/AvatarHero.tsx`; Modify `StudioPanel.tsx`.
Design: `.blk` hero (mobile ~235-244; desktop `.ava` ~righe avatar bar).

- [ ] **Step 1:** Card grande: ritratto (`portraitFor`/`/api/sample`), alias, badge tier (mostrato "ECHO" via `TIER_CONFIG` — riverifica badge), stato consenso per la categoria (salvia se ok, coral se escluso), "Cambia volto" -> `setSelectedHandle(null)` (torna ai risultati). Commit dopo verifica preview.

### Task 9: Scena (prompt) + enhancer

**Files:** Create `app/match/studio/ScenePrompt.tsx`; Modify `StudioPanel.tsx`.
Design: `.blk` scena + `.enh` + `.proposal` (mobile ~247-256).

- [ ] **Step 1:** Textarea legata a `sceneByHandle[handle]`. Bottone "Migliora prompt" chiama l'esistente `enhance(handle)` (POST `/api/enhance-prompt`, gia in MatchClient). Proposta evidenziata con "Usa questa" / "Tieni la mia" (comportamento identico all'attuale, mai automatico).
- [ ] **Step 2:** Verifica preview: scrivo una scena, "Migliora prompt" mostra la proposta, "Usa questa" la sostituisce. Commit.

### Task 10: Picker Posa (bottom sheet categorizzato) + Inquadratura + Espressione (icone)

**Files:** Create `app/match/studio/PosePicker.tsx`, `app/match/studio/IconPicker.tsx`; Modify `StudioPanel.tsx`.
Design: bottom sheet mobile (`#sheet`/`#scrim`, JS `openSheet/closeSheet` ~485-495); desktop inline (`.seg`/`.scroller`).

- [ ] **Step 1:** `PosePicker`: campo `.field` che apre un bottom sheet (mobile) / pannello inline (desktop) con le pose da `POSES` raggruppate per `cat`, icone grandi, selezione singola, scrive `pose`. Scrim click-to-close, `transform: translateY(101%) -> 0`.
- [ ] **Step 2:** `IconPicker` riusabile per Inquadratura (`FRAMINGS`, default `mezzo_busto`) ed Espressione (`EXPRESSIONS`, default `naturale`), 4 e 5 icone, selezione singola.
- [ ] **Step 3:** Le icone SVG: portare i set `SIL`/`FRAME`/`FACE` dai file design (silhouette pose, guide inquadratura, volti espressione). Su mobile il preview headless congela framer-motion: verificare lo stato via misura/`preview_eval`, non screenshot.
- [ ] **Step 4:** Verifica preview: apro il sheet pose, scelgo "Braccia conserte"; cambio inquadratura ed espressione; lo stato si aggiorna. Commit.

### Task 11: Stile colore (chip) + Look fotografico (macchina/ottica/luce)

**Files:** Create `app/match/studio/ColorStyleRow.tsx`, `app/match/studio/PhotographicLook.tsx`; Modify `StudioPanel.tsx`.
Design: `.chiprow` stile colore con swatch; `.cams` 2x2, `.chiprow` ottica monospace, `.chiprow` luce; sfumatura scroll a destra (`.hwrap::after`).

- [ ] **Step 1:** `ColorStyleRow`: chip da `COLOR_STYLES` con pallino colore (gradient CSS dal design), selezione singola -> `colorStyle`.
- [ ] **Step 2:** `PhotographicLook`: Macchina (`CAMERAS`, griglia 2x2), Ottica (`LENSES`, riga monospace coi mm, default `85mm`), Luce (`LIGHTS`, riga). Righe orizzontali con la sfumatura `.hwrap::after` (gradiente verso `--bg`) che segnala lo scroll.
- [ ] **Step 3:** Riga di onesta (STUDIO_GEN spec, "Note di onesta"): l'ottica e simulata, frase discreta sotto.
- [ ] **Step 4:** Verifica preview: seleziono macchina/ottica/luce/stile, lo stato cambia e (Task 13) il prompt finale si aggiorna. Commit.

### Task 12: Immagini di riferimento (max 2, ruoli, un solo outfit)

**Files:** Modify `StudioPanel.tsx` (riusa la logica `echoRefs`/`pickEcho`/`updateEcho`/`removeEcho` esistente).
Design: `.ref` slot con `select.role` + `input.desc` + `.refnote` "Un solo outfit per generazione".

- [ ] **Step 1:** Due slot con ruolo (Outfit/capo, Accessorio, Sfondo/scenario, Oggetto) + descrizione d'uso. Vincolo: se uno slot e "Outfit", l'altro non offre "Outfit" (disabilitare l'opzione). La POSA NON occupa piu uno slot (ora e indipendente, Task 10): rimuovere il flusso `poseLib`/`poseOpenFor`/`pickPose`/`poseChosen` e il blocco "Posa dalla libreria" dagli slot ref.
- [ ] **Step 2:** Verifica preview: carico un'immagine outfit nello slot 1, lo slot 2 non offre piu "Outfit"; descrizione d'uso editabile. Commit.

### Task 13: Motore/Formato + Prompt finale (anteprima live) + Genera

**Files:** Create `app/match/studio/FinalPrompt.tsx`, `app/match/studio/GenerateBar.tsx`; Modify `StudioPanel.tsx`.
Design: `.enginechip` "ECHO fotoreale" (stato fisso, NON un toggle — riverifica solo ECHO), `.seg` formato/risoluzione, `.finalp`, CTA `.btn` con VOLT.

- [ ] **Step 1:** Chip motore FISSO "ECHO fotoreale / identita bloccata" (nessun toggle motore). Formato (`ECHO_FORMATS`), Risoluzione (`ECHO_RESES`, escludi 4K se quadrato — logica esistente), Qualita come oggi.
- [ ] **Step 2:** `FinalPrompt`: anteprima live che ricompone i token usando lo stesso catalogo `lib/studio-options.ts`. Ordine identico al server (`lib/echo-prompt.ts`): scena, poi `poseToken`, poi le clausole ref, poi `photographicSegment({colorStyle,framing,expression,camera,lens,light})`, e la nota "+ prefisso identita di sistema (lato server)". Cosi l'anteprima client e fedele alla composizione server.
- [ ] **Step 3:** `GenerateBar`: bottone Amber pieno con il costo dentro (`voltStr("gen.cta", ...)`), stato di lavorazione e flusso async invariati.
- [ ] **Step 4:** Verifica preview: cambiando i controlli il "prompt finale" mostra il segmento `Photographed as: ...` con i token attesi. Commit.

### Task 14: Inviare i nuovi campi a `/api/generate` + risultato

**Files:** Modify `MatchClient.tsx` (funzione `generate`, body righe 369-384).

- [ ] **Step 1:** Aggiungere al body inviato (oltre ai campi attuali): `pose, framing, expression, colorStyle, camera, lens, light`. Sostituire `poseId`/`styleId` con `pose` (enum). `styleId` resta assente (solo ECHO). `extraRefs` come oggi (filtro byte). 

```typescript
body: JSON.stringify({
  handle, mode, category, scene, engine, echoSize, echoQuality,
  extraRefs,
  pose, framing, expression, colorStyle, camera, lens, light,
}),
```

- [ ] **Step 2:** Verifica: `npx tsc --noEmit && npm run build` PASS. Preview: una richiesta di generazione parte (async) e il polling/risultato funziona come prima (download con provenienza, ShareStory invariati). Commit.

### Task 15: Adattamento desktop a due colonne

**Files:** Modify `StudioPanel.tsx` + sottocomponenti (responsive Tailwind).
Design: `design/anteprima_match_studio_redesign.html` (colonna sinistra controlli, colonna destra sticky risultato; inquadratura/espressione come `.seg` inline, posa come `.scroller`, look in `<details>`).

- [ ] **Step 1:** Layout a due colonne >= breakpoint desktop: controlli a sinistra, anteprima/risultato sticky a destra. Su mobile resta single-column col bottom sheet. Riusare gli stessi componenti con varianti responsive (niente duplicazione di stato).
- [ ] **Step 2:** Verifica: QA mobile per MISURA (iframe 375px, scrollWidth vs 375 per overflow) e desktop a runtime; nessun overflow orizzontale, tap target adeguati. Commit.

### Task 16: Verifica finale + riverifica "solo ECHO"

- [ ] **Step 1:** `npx tsc --noEmit && npm run build` PASS.
- [ ] **Step 2: Riverifica "solo ECHO" (a terra):**
  - `/match` (nuovo Studio): NESSUN controllo Modello/Stile/HUMAN/SHAPE/Soul; chip motore fisso "ECHO". (Bash grep su `app/match/**` per `HUMAN|SHAPE|soul-models|styleId|model=`.)
  - Badge avatar = "ECHO" (`TIER_CONFIG.SOUL.label`).
  - `/api/generate`: `useEcho = true` invariato; body senza `model/styleId` non cambia nulla.
- [ ] **Step 3: E2E reale (Morelz, ~0,26 euro):** una generazione ECHO con macchina/ottica/luce/stile/inquadratura/espressione scelti -> confermare nei log server `[ECHO ...]` e (con migrazione applicata) le colonne `camera/lens/...` valorizzate sulla riga `generations`; verificare visivamente che l'output rispecchi la scelta fotografica.
- [ ] **Step 4:** Finire la branch: `superpowers:finishing-a-development-branch` (decidere merge/push con Morelz, push SOLO a "pubblica").

**Definition of done (dalla spec sezione 7, Studio):**
- [ ] Parto da "Cosa vuoi creare", scelgo un obiettivo e i parametri si preimpostano.
- [ ] Le pose sono sotto il prompt, pannello a icone, raggruppate per categoria.
- [ ] Inquadratura ed espressione sono picker a icone, selezione singola.
- [ ] Stile colore, macchina, ottica (con mm), luce funzionano e finiscono nel prompt.
- [ ] Le immagini di riferimento hanno ruolo, descrizione e vincolo di un solo outfit.
- [ ] Il prompt finale mostra i token; il backend li compone da whitelist.
- [ ] Genero con ECHO, consenso, royalty, certificato e VOLT invariati.

---

## Self-Review (eseguita su questo piano)

- **Copertura spec Parte A:** avvio per obiettivo (T7), avatar hero (T8), prompt+enhancer (T9), pose/inquadratura/espressione (T10), stile colore + look (T11), riferimenti (T12), motore/formato + prompt finale + genera (T13), campi nuovi a /api/generate (T3/T14), buildEchoPrompt esteso da whitelist (T2/T3), migrazione additiva (T5), desktop (T15). Coperto.
- **Coerenza tipi:** `photographic`/`photo` definiti in `EchoJobParams` (T4) e prodotti in route.ts (T3); `buildEchoPrompt(scene, extras, poseText, identityText, photographic)` con la stessa firma ovunque (T2). `validEnum`/`*Token`/`photographicSegment` definiti in T1 e usati in T3/T13.
- **Niente segnaposto sul backend** (codice completo). Sui task UI la fedelta e demandata ai file design per scelta esplicita della spec (sezione "Nota di fedelta UI"), con stato/handler/catalogo/verifica specificati.
- **Fuori scope (Piano B):** l'Editor di post-produzione (sezione 4 della spec) e tutto demandato al piano separato; `sharp` come dependency esplicito si aggiunge li.
