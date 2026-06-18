# ECHO motore unico — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere ECHO (gpt-image-2) l'unico motore di generazione: via dalla UI il toggle motore e i modelli Higgsfield/Soul (HUMAN/SHAPE) + stili; badge avatar a "ECHO"; codice Higgsfield dormiente.

**Architecture:** Tre tagli chirurgici (UI `/match`, API `/api/generate`, etichetta tier) + una passata di copia. Niente cancellazioni di `lib/higgsfield.ts`/`lib/soul-models.ts` (restano importabili ma fuori dal percorso vivo). Reversibile.

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind. Verifica: `npx tsc --noEmit` + `npm run build` + ground-truth nel preview MCP (dev server :3000). Niente unit test (il progetto verifica con build + preview, vedi CLAUDE.md).

**Spec:** `docs/superpowers/specs/2026-06-18-echo-motore-unico-design.md`

---

### Task 1: `/match` — ECHO unico motore, via i modelli Higgsfield/Soul

**Files:**
- Modify: `app/match/MatchClient.tsx`

Contesto: oggi `engine` è uno stato `"higgsfield" | "echo"` (default `"higgsfield"`); il blocco "Modello" (righe ~830-843) offre i chip HUMAN/SHAPE (`SOUL_MODELS`) + il chip ECHO; il blocco "Stile" (righe ~985-994) mostra `SOUL_STYLES` quando `modelSupportsStyles`. Vanno tolti; il motore diventa fisso `echo`.

- [ ] **Step 1: fissare engine = echo e rimuovere stato Higgsfield**

In `app/match/MatchClient.tsx`:

Riga 225, sostituire:
```tsx
const [engine, setEngine] = useState<"higgsfield" | "echo">("higgsfield");
```
con:
```tsx
// ECHO (gpt-image-2) e l'unico motore: niente piu scelta Higgsfield/Soul.
const engine = "echo" as const;
```

Rimuovere lo stato non piu usato (righe 291-293):
```tsx
const [model, setModel] = useState<SoulModel>(DEFAULT_MODEL);
const [styleId, setStyleId] = useState("");
const modelSupportsStyles = engine === "higgsfield" && (SOUL_MODELS.find((m) => m.id === model)?.supportsStyles ?? false);
```
(eliminare tutte e tre le righe).

Riga 10, rimuovere l'import ora inutile:
```tsx
import { SOUL_MODELS, SOUL_STYLES, DEFAULT_MODEL, SoulModel } from "@/lib/soul-models";
```

- [ ] **Step 2: rimuovere il blocco "Modello" (selettore HUMAN/SHAPE/ECHO)**

Eliminare l'intero blocco righe ~830-843 (da `<div className="mt-4">` con `<span ...>Modello</span>` fino al `</div>` che chiude la nota `engine === "echo"`):
```tsx
<div className="mt-4">
  <span className="mb-2 block text-xs font-semibold text-muted">Modello</span>
  <div className="flex flex-wrap gap-2">
    {SOUL_MODELS.map((m) => (
      <Chip key={m.id} active={engine === "higgsfield" && model === m.id} onClick={() => { setEngine("higgsfield"); setModel(m.id); }}>{m.label} · {m.quality}</Chip>
    ))}
    <Chip active={engine === "echo"} onClick={() => setEngine("echo")}>ECHO · fotoreale</Chip>
  </div>
  {engine === "echo" && (
    <p className="mt-2 text-[0.7rem] leading-relaxed text-teal">
      Massima fedeltà: l&apos;identità è bloccata dalle foto reali della persona.
    </p>
  )}
</div>
```
Sostituirlo con una riga informativa statica (niente scelta):
```tsx
<div className="mt-4">
  <p className="text-[0.7rem] leading-relaxed text-teal">
    Motore ECHO · massima fedeltà: l&apos;identità è bloccata dalle foto reali della persona.
  </p>
</div>
```

- [ ] **Step 3: rimuovere il blocco "Stile" (SOUL_STYLES)**

Eliminare l'intero blocco righe ~985-994:
```tsx
{modelSupportsStyles && (
  <div className="mt-3">
    <span className="mb-2 block text-xs font-semibold text-muted">Stile <span className="font-normal text-faint">· opzionale</span></span>
    <div className="flex flex-wrap gap-2">
      {SOUL_STYLES.map((s) => (
        <Chip key={s.id} active={styleId === s.id} onClick={() => setStyleId(styleId === s.id ? "" : s.id)}>{s.label}</Chip>
      ))}
    </div>
  </div>
)}
```
(rimuovere completamente; `modelSupportsStyles`, `styleId`, `SOUL_STYLES` non esistono piu).

- [ ] **Step 4: pulire i riferimenti residui a model/styleId nel body della richiesta**

Riga ~386, dentro l'oggetto inviato a `/api/generate`, sostituire:
```tsx
styleId: modelSupportsStyles ? (styleId || null) : null,
```
con:
```tsx
styleId: null,
```
Rimuovere eventuale `model,` passato nel body (cercare `model:` / `model,` nell'oggetto della fetch a `/api/generate` in questo file e toglierlo: il server userà sempre ECHO).

Le condizioni `engine === "echo"` rimaste (righe ~379, 384, 486, 689, 696, 782) restano valide (sono sempre vere): lasciarle invariate per minimizzare la superficie di modifica. NON devono restare confronti `engine === "higgsfield"` (darebbero errore di tipo con `engine` literal): verificarlo a Step 5.

- [ ] **Step 5: typecheck**

Run: `cd /f/human2ai-passport && npx tsc --noEmit`
Expected: 0 errori. Se segnala `engine === "higgsfield"` come confronto impossibile, rimuovere quel ramo (e morto). Se segnala import inutilizzati (`SoulModel`, ecc.), rimuoverli.

- [ ] **Step 6: verifica a terra nel preview**

Dev server gia su :3000 (altrimenti `preview_start "dev"`). Loggarsi se serve (seller `test-card-e3@h2ai.dev` / `H2ai-test-2026!`), aprire `/match`, scegliere un avatar, arrivare al pannello di generazione. Verificare via `preview_eval`/snapshot: NON compaiono i chip "HUMAN", "SHAPE", "ECHO · fotoreale", ne la sezione "Stile"; compaiono solo Formato/Risoluzione/Qualità/Capi e scenari (controlli ECHO). Console pulita.

- [ ] **Step 7: commit**

```bash
cd /f/human2ai-passport
git add app/match/MatchClient.tsx
git commit -F- <<'MSG'
ECHO motore unico: via i modelli Higgsfield/Soul da /match

Il selettore motore e i modelli HUMAN/SHAPE piu gli stili Soul spariscono
dalla generazione: ECHO (gpt-image-2) e l'unico motore. engine fissato a echo,
stato model/styleId/modelSupportsStyles rimosso, import soul-models tolto.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 2: `/api/generate` — forzare ECHO lato server

**Files:**
- Modify: `app/api/generate/route.ts`

Contesto: riga 143 `const useEcho = body?.engine === "echo";` decide il ramo; se falso si va su `generateWithHiggsfield` (righe ~312-331). L'etichetta tier del contenuto e `useEcho ? "ECHO" : modelTierLabel(model)` (righe 238, 425).

- [ ] **Step 1: forzare useEcho = true**

Riga 143, sostituire:
```ts
const useEcho = body?.engine === "echo";
```
con:
```ts
// ECHO e l'unico motore: ogni generazione passa da gpt-image-2.
const useEcho = true;
```

- [ ] **Step 2: etichetta tier sempre ECHO**

Righe 238 e 425, semplificare:
```ts
const tierLabel = useEcho ? "ECHO" : modelTierLabel(model);
```
→
```ts
const tierLabel = "ECHO";
```
e
```ts
const meta: Record<string, unknown> = { tier: useEcho ? "ECHO" : modelTierLabel(model) };
```
→
```ts
const meta: Record<string, unknown> = { tier: "ECHO" };
```

Il ramo `generateWithHiggsfield` (righe ~312-331) diventa irraggiungibile: lasciarlo (dormiente). Se `tsc` segnala import/variabili ora inutilizzati (`modelTierLabel`, `model`, `isValidModel`, `DEFAULT_MODEL`, `generateWithHiggsfield`, `isValidStyle`, `styleId`), NON cancellare le funzioni dei moduli dormienti, ma rimuovere gli import/variabili inutilizzati in QUESTO file finche `tsc` e verde.

- [ ] **Step 3: typecheck + build**

Run: `cd /f/human2ai-passport && npx tsc --noEmit && npm run build`
Expected: 0 errori, build verde.

- [ ] **Step 4: E2E generazione ECHO ancora funzionante**

Con dev server su, una generazione reale resta possibile (rotta dev): `curl -sS -G "http://localhost:3000/api/echo-test" --data-urlencode "handle=random" --data-urlencode "size=1024x1024" --data-urlencode "quality=low" -m 120` → `{"ok":true,...,"engine":"echo"}`. (Qualità `low` per spendere pochissimo.)

- [ ] **Step 5: commit**

```bash
cd /f/human2ai-passport
git add app/api/generate/route.ts
git commit -F- <<'MSG'
ECHO motore unico: /api/generate forza echo

useEcho sempre true: ogni generazione passa da gpt-image-2; il ramo
Higgsfield resta nel file ma irraggiungibile (dormiente). Etichetta tier
del contenuto sempre ECHO. Import inutilizzati rimossi.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 3: Badge avatar → "ECHO"

**Files:**
- Modify: `lib/types.ts`

Contesto: tutti gli avatar sono tier `SOUL`; il badge mostra `TIER_CONFIG[tier].label`. Cambiando l'etichetta del tier SOUL il badge mostra "ECHO" ovunque (catalogo, passaporto, registro, OG image).

- [ ] **Step 1: rinominare l'etichetta del tier SOUL**

In `lib/types.ts`, nel `TIER_CONFIG`, riga del tier SOUL, sostituire:
```ts
SOUL:   { label: "SOUL",   color: "#D8D2C6", bg: "rgba(242,233,216,0.11)", description: "Alta fedeltà" },
```
con:
```ts
SOUL:   { label: "ECHO",   color: "#D8D2C6", bg: "rgba(242,233,216,0.11)", description: "Alta fedeltà" },
```
(SPARK/SHAPE/HUMAN restano invariati: nessun avatar li usa, ma servono al tipo `Tier`.)

- [ ] **Step 2: typecheck**

Run: `cd /f/human2ai-passport && npx tsc --noEmit`
Expected: 0 errori.

- [ ] **Step 3: verifica a terra**

Nel preview aprire `/catalogo` e un passaporto (es. `/passport/random`): il badge mostra "ECHO" (non piu "SOUL"). Misurare via `preview_eval` il testo del badge se lo screenshot va in timeout.

- [ ] **Step 4: commit**

```bash
cd /f/human2ai-passport
git add lib/types.ts
git commit -F- <<'MSG'
ECHO motore unico: badge avatar mostra ECHO

L'etichetta del tier SOUL (l'unico usato dagli avatar) diventa ECHO: il
badge su catalogo, passaporto, registro e OG image mostra ECHO, coerente
col motore unico. SPARK/SHAPE/HUMAN restano nel tipo, inutilizzati.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 4: Passata di copia + verifica finale

**Files:**
- Modify: eventuali pagine `app/**` con menzioni utente di Higgsfield/Soul/HUMAN/SHAPE.

- [ ] **Step 1: trovare menzioni utente residue**

Run: `cd /f/human2ai-passport && grep -rniE "higgsfield|\\bsoul\\b|HUMAN|SHAPE" app --include=*.tsx | grep -viE "soul-models|SoulModel|generateWithHiggsfield"`
Esaminare ogni hit: se e testo mostrato all'utente che promette modelli HUMAN/SHAPE o il motore Higgsfield, riscriverlo in chiave ECHO (es. "il motore fotoreale ECHO"). Le occorrenze tecniche interne (nomi di funzione/variabile, commenti) si lasciano.

- [ ] **Step 2: aggiornare le copy trovate**

Per ogni testo utente fuorviante, sostituire il riferimento a Higgsfield/Soul/HUMAN/SHAPE con la formulazione ECHO. Mostrare il diff di ciascuna modifica (niente trattini lunghi, regola CLAUDE.md). Se non emerge nessun testo utente (probabile: la pagina prezzi cita solo "motore fotoreale", gia valido), saltare: nessuna modifica.

- [ ] **Step 3: build finale + sweep preview**

Run: `cd /f/human2ai-passport && npx tsc --noEmit && npm run build`
Expected: verde.
Preview: `/match` (solo ECHO), `/catalogo` e un passaporto (badge ECHO), una generazione di prova. Console pulita.

- [ ] **Step 4: commit (se ci sono modifiche di copia)**

```bash
cd /f/human2ai-passport
git add -A app
git commit -F- <<'MSG'
ECHO motore unico: copy senza riferimenti a Higgsfield/Soul

Allineate le poche menzioni utente residue al motore unico ECHO.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
MSG
```

---

## Note di esecuzione
- Push SOLO a "pubblica" (gate di Morelz): i commit restano in locale finche non lo dice.
- Ordine consigliato: Task 1 → 2 → 3 → 4. Ogni task chiude con `tsc` verde e un commit.
- Il dev server preview e gia attivo su :3000 in questa sessione.
