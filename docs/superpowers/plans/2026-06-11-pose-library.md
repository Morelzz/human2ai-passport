# Libreria pose (manichini) per ECHO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il compratore sceglie una posa da una libreria di manichini pre-generati; ECHO genera l'avatar in quella posa (più l'eventuale outfit nell'altro slot).

**Architecture:** Le pose sono PNG nel bucket pubblico `assets/poses/` (zero migrazioni). `GET /api/poses` lista la cartella; il client manda solo `poseId`; il server risolve l'id in un'immagine reference con nuovo ruolo `posa` PRIMA di entrambi i percorsi (sync e worker async), che da lì in poi restano invariati. Gate consenso, watermark, royalty: intoccati.

**Tech Stack:** Next.js App Router + TypeScript, Supabase Storage (bucket `assets`), gpt-image-2 (text-to-image per i manichini), sharp (già in uso).

**Regole di progetto che OVERRIDANO il template:** un modulo = UN SOLO commit a fine modulo (niente commit frequenti); NESSUN push senza "pubblica" esplicito di Morelz. Il repo NON ha test framework: la verifica è `npx tsc --noEmit`, `npm run build`, curl e preview browser (pattern consolidato del progetto).

**Spec:** `docs/superpowers/specs/2026-06-11-pose-library-design.md`

---

### Task 1: `lib/poses.ts` — libreria server-only

**Files:**
- Create: `lib/poses.ts`

- [ ] **Step 1.1: Crea il modulo**

```ts
// ──────────────────────────────────────────────────────────────────────────
// Libreria pose (manichini) per ECHO — SERVER-ONLY.
//
// Le pose vivono come PNG nel bucket pubblico `assets`, cartella `poses/`:
// aggiungere una posa = caricare un file (zero codice, zero migrazioni).
// Il client riceve {id, label, url} da /api/poses e rimanda SOLO l'id:
// l'immagine la peschiamo noi dallo storage (mai byte di posa dal client).
// ──────────────────────────────────────────────────────────────────────────
import { createServerClient } from "@/lib/supabase";

export const POSES_BUCKET = "assets";
export const POSES_PREFIX = "poses";

// Etichette italiane per gli slug noti; una posa nuova senza etichetta
// funziona comunque (fallback: slug umanizzato).
const POSE_LABELS: Record<string, string> = {
  "standing-front": "In piedi frontale",
  "three-quarter": "Tre quarti",
  walking: "Camminata",
  "arms-crossed": "Braccia conserte",
  "hands-in-pockets": "Mani in tasca",
  "sitting-stool": "Seduta su sgabello",
  "leaning-wall": "Appoggio al muro",
  profile: "Profilo",
  "hand-on-chin": "Mano al mento",
  "legs-crossed-standing": "Gamba incrociata",
  "sitting-floor": "Seduta a terra",
  "arms-open": "Braccia aperte",
};

export interface PoseEntry {
  id: string;
  label: string;
  url: string;
}

export function poseLabel(id: string): string {
  return POSE_LABELS[id] ?? id.replace(/-/g, " ");
}

// Lista la libreria dallo storage. Difensiva: cartella assente/vuota → [].
export async function listPoses(): Promise<PoseEntry[]> {
  const admin = createServerClient();
  const { data: files } = await admin.storage.from(POSES_BUCKET).list(POSES_PREFIX, { limit: 100 });
  if (!files) return [];
  return files
    .filter((f) => f.name.toLowerCase().endsWith(".png"))
    .map((f) => {
      const id = f.name.replace(/\.png$/i, "");
      const { data } = admin.storage.from(POSES_BUCKET).getPublicUrl(`${POSES_PREFIX}/${f.name}`);
      return { id, label: poseLabel(id), url: data.publicUrl };
    });
}

// Scarica UNA posa per la generazione (data-URL pronto per il resolver extras).
// Id validato come slug; posa inesistente → null (il chiamante risponde 400).
export async function fetchPoseDataUrl(id: string): Promise<string | null> {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) return null;
  const admin = createServerClient();
  const { data } = await admin.storage.from(POSES_BUCKET).download(`${POSES_PREFIX}/${id}.png`);
  if (!data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  return `data:image/png;base64,${buf.toString("base64")}`;
}
```

- [ ] **Step 1.2: Typecheck**

Run: `npx tsc --noEmit`
Expected: zero errori (il file compila; gli import `createServerClient` esistono già in `lib/supabase`).

---

### Task 2: `GET /api/poses`

**Files:**
- Create: `app/api/poses/route.ts`

- [ ] **Step 2.1: Crea la rotta**

```ts
import { NextResponse } from "next/server";
import { listPoses } from "@/lib/poses";

export const runtime = "nodejs";

// GET /api/poses — libreria pubblica delle pose (manichini) per ECHO.
// Cache CDN 5 minuti: aggiungere una posa = caricare un file, compare da sola.
export async function GET() {
  try {
    const poses = await listPoses();
    return NextResponse.json(
      { poses },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    // Difensiva: storage irraggiungibile → libreria vuota, mai 500 al client.
    return NextResponse.json({ poses: [] });
  }
}
```

- [ ] **Step 2.2: Verifica a vuoto (cartella poses/ non ancora esistente)**

Run: `curl -s http://localhost:3000/api/poses`
Expected: `{"poses":[]}` con status 200 (difensiva ok). Se il dev server non è attivo, avviarlo prima (preview_start).

---

### Task 3: Server wiring — `poseId` → reference con ruolo `posa` (sync + async)

**Files:**
- Modify: `app/api/generate/route.ts` (clauseForExtra ~riga 28-40; risoluzione pose dopo ~riga 121; usi di `body?.extraRefs` alle righe ~138 e ~175)
- Modify: `lib/echo-job.ts` (clauseForExtra ~riga 62-74)

- [ ] **Step 3.1: Aggiungi il caso `posa` a `clauseForExtra` in ENTRAMBI i file**

In `app/api/generate/route.ts` E in `lib/echo-job.ts`, dentro lo `switch (e.role)`, PRIMA di `default:`:

```ts
    case "posa":
      // La desc non serve: la posa è definita interamente dall'immagine.
      return `the person adopts the exact body pose shown in the grey mannequin reference image — ignore the mannequin's appearance, material and setting, it only defines the body pose`;
```

- [ ] **Step 3.2: Risolvi `poseId` in `app/api/generate/route.ts`**

Aggiungi l'import in testa al file:

```ts
import { fetchPoseDataUrl } from "@/lib/poses";
```

Subito DOPO la riga `const echoQuality = ...` (~riga 121) e PRIMA del blocco `if (useEcho && !isPreview)`:

```ts
  // Posa dalla libreria: il client manda SOLO l'id; l'immagine la peschiamo noi
  // dal bucket pubblico e la accodiamo come extra con ruolo 'posa'. La posa
  // occupa uno dei 2 slot extra → al massimo 1 upload cliente + 1 posa.
  // Posa inesistente → 400 PRIMA di toccare OpenAI (zero costi).
  let extraRefs: Array<{ data?: unknown; role?: unknown; desc?: unknown }> =
    Array.isArray(body?.extraRefs) ? body.extraRefs.slice(0, 2) : [];
  if (useEcho && body?.poseId) {
    const poseData = await fetchPoseDataUrl(String(body.poseId));
    if (!poseData) {
      return NextResponse.json({ error: "Posa non trovata nella libreria" }, { status: 400 });
    }
    extraRefs = [...extraRefs.slice(0, 1), { data: poseData, role: "posa", desc: "" }];
  }
```

- [ ] **Step 3.3: Usa `extraRefs` risolti nei DUE percorsi**

Nel percorso ASYNC (~riga 138), sostituisci:

```ts
    const extras = await prepareExtras(body?.extraRefs);
```

con:

```ts
    const extras = await prepareExtras(extraRefs);
```

Nel percorso SYNC (~riga 175), sostituisci:

```ts
    const rawExtras = Array.isArray(body?.extraRefs) ? body.extraRefs.slice(0, 2) : [];
```

con:

```ts
    const rawExtras = extraRefs;
```

(Il resto del loop sync resta identico: i typeof-check su `ex?.data`/`ex?.role`/`ex?.desc` narrowano già i tipi `unknown`.)

- [ ] **Step 3.4: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: zero errori. Se il loop sync dà errori di tipo su `ex.data`, verificare che il check sia `typeof ex?.data === "string"` prima dell'uso (narrowing).

- [ ] **Step 3.5: Verifica errore pulito (zero costi)**

Con dev server attivo e utente loggato (account test `test-card-e3@h2ai.dev`), via preview_eval:

```js
fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ handle: "mario-r", mode: "preview", engine: "echo", poseId: "posa-inesistente", scene: "test" })
}).then(r => r.json())
```

Expected: `{ error: "Posa non trovata nella libreria" }`, status 400, NESSUNA chiamata OpenAI nei log server.

---

### Task 4: UI in MatchClient — selettore "Posa dalla libreria"

**Files:**
- Modify: `app/match/MatchClient.tsx` (tipo EchoRef ~riga 160; stato ~riga 161; body fetch ~riga 278-280; box "Capi e scenari" ~righe 684-748)

- [ ] **Step 4.1: Estendi tipo e stato**

Sostituisci (~riga 160):

```ts
  type EchoRef = { dataUrl: string; desc: string; role: string } | undefined;
```

con:

```ts
  // poseId presente = lo slot è occupato da una posa della LIBRERIA (il client
  // non manda i byte: solo l'id; dataUrl qui è l'URL pubblico per l'anteprima).
  type EchoRef = { dataUrl: string; desc: string; role: string; poseId?: string } | undefined;
```

Subito dopo `const [echoRefs, setEchoRefs] = useState<EchoRef[]>([]);` aggiungi:

```ts
  // Libreria pose: caricata una volta quando si sceglie ECHO; null = mai chiesta.
  const [poseLib, setPoseLib] = useState<{ id: string; label: string; url: string }[] | null>(null);
  const [poseOpenFor, setPoseOpenFor] = useState<number | null>(null);
  useEffect(() => {
    if (engine !== "echo" || poseLib !== null) return;
    fetch("/api/poses")
      .then((r) => r.json())
      .then((j) => setPoseLib(Array.isArray(j?.poses) ? j.poses : []))
      .catch(() => setPoseLib([]));
  }, [engine, poseLib]);

  function pickPose(i: number, pose: { id: string; label: string; url: string }) {
    setEchoRefs((prev) => {
      const next = [...prev];
      next[i] = { dataUrl: pose.url, desc: pose.label, role: "posa", poseId: pose.id };
      return next;
    });
    setPoseOpenFor(null);
  }
  const poseChosen = echoRefs.some((r) => r?.poseId);
```

NB: verificare che `useEffect` sia già importato da react in testa al file (lo è quasi certamente; altrimenti aggiungerlo).

- [ ] **Step 4.2: Invia `poseId` e filtra gli upload nel body di `generate()`**

Sostituisci (~righe 278-280):

```ts
        extraRefs: engine === "echo"
          ? echoRefs.filter((r): r is { dataUrl: string; desc: string; role: string } => !!r?.dataUrl).map((r) => ({ data: r.dataUrl, desc: r.desc, role: r.role }))
          : undefined,
```

con:

```ts
        extraRefs: engine === "echo"
          ? echoRefs
              .filter((r): r is NonNullable<EchoRef> => !!r?.dataUrl && !r?.poseId)
              .map((r) => ({ data: r.dataUrl, desc: r.desc, role: r.role }))
          : undefined,
        poseId: engine === "echo" ? (echoRefs.find((r) => r?.poseId)?.poseId ?? null) : null,
```

- [ ] **Step 4.3: Render dello slot posa + bottone + griglia di scelta**

Nel render dei 2 box (~riga 691), dentro `{[0, 1].map((i) => { ... })}`, il ramo `ref?.dataUrl` va sdoppiato: se `ref.poseId` è presente, mini-card posa SENZA select ruolo e SENZA input desc. Sostituisci il blocco `{ref?.dataUrl ? (<>...</>) : (<label ...>...</label>)}` con:

```tsx
{ref?.dataUrl ? (
  <>
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ref.dataUrl} alt="" className={`h-24 w-full rounded-lg ${ref.poseId ? "object-contain bg-white/[0.04]" : "object-cover"}`} />
      <button
        type="button"
        onClick={() => removeEcho(i)}
        aria-label="Rimuovi"
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
      >
        ✕
      </button>
    </div>
    {ref.poseId ? (
      <p className="mt-2 truncate text-xs text-teal">Posa · {ref.desc}</p>
    ) : (
      <>
        <select
          value={ref.role}
          onChange={(e) => updateEcho(i, { role: e.target.value })}
          className="mt-2 w-full rounded-lg border border-white/10 bg-obsidian-2 px-2 py-1.5 text-xs text-foreground outline-none focus:border-teal/50"
        >
          <option value="outfit">Outfit / capo</option>
          <option value="accessorio">Accessorio</option>
          <option value="sfondo">Sfondo / scenario</option>
          <option value="oggetto">Oggetto</option>
        </select>
        <input
          value={ref.desc}
          onChange={(e) => updateEcho(i, { desc: e.target.value })}
          placeholder="descrizione (opzionale)"
          className="mt-1.5 w-full rounded-lg border border-white/10 bg-obsidian-2 px-2.5 py-2 text-xs text-foreground outline-none focus:border-teal/50"
        />
      </>
    )}
  </>
) : (
  <div className="flex h-[124px] flex-col gap-1.5">
    <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 text-center text-faint transition-colors hover:border-teal/40 hover:text-teal">
      <span className="text-xl leading-none">+</span>
      <span className="px-2 text-[0.66rem] leading-tight">{i === 0 ? "Outfit / capo" : "Scenario / altro"}</span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { pickEcho(i, e.target.files?.[0]); e.currentTarget.value = ""; }}
      />
    </label>
    {!poseChosen && (poseLib?.length ?? 0) > 0 && (
      <button
        type="button"
        onClick={() => setPoseOpenFor(poseOpenFor === i ? null : i)}
        className={`rounded-lg border px-2 py-1.5 text-[0.66rem] transition-colors ${poseOpenFor === i ? "border-teal/50 text-teal" : "border-white/15 text-faint hover:border-teal/40 hover:text-teal"}`}
      >
        🧍 Posa dalla libreria
      </button>
    )}
  </div>
)}
```

Subito DOPO la chiusura del `<div className="grid grid-cols-2 gap-2">…</div>` dei 2 box, aggiungi la griglia di scelta (visibile solo quando il bottone è attivo):

```tsx
{poseOpenFor !== null && !poseChosen && (
  <div className="mt-2 rounded-xl border border-white/10 bg-obsidian p-2">
    <p className="mb-2 px-1 text-[0.66rem] text-faint">Scegli la posa: il manichino guida SOLO il corpo, l&apos;identità resta della persona.</p>
    <div className="grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto">
      {(poseLib ?? []).map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => pickPose(poseOpenFor, p)}
          className="group rounded-lg border border-white/10 bg-white/[0.03] p-1 text-left transition-colors hover:border-teal/50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt={p.label} className="h-16 w-full rounded object-contain" loading="lazy" />
          <span className="mt-1 block truncate px-0.5 text-[0.6rem] text-faint group-hover:text-teal">{p.label}</span>
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 4.4: Ritocco microcopy**

Nel paragrafo di aiuto sotto i box (~riga 745), sostituire «(posa, luce)» con «(luce, espressione)» — la posa ora ha il suo controllo dedicato.

- [ ] **Step 4.5: Typecheck + verifica visiva**

Run: `npx tsc --noEmit` → zero errori.
Preview: /match → trova un avatar → seleziona ECHO → comparirà il bottone «Posa dalla libreria» SOLO quando `/api/poses` ritorna pose (dopo il Task 5). A libreria vuota il bottone NON compare (comportamento voluto, regressione zero).

---

### Task 5: Generazione manichini + upload libreria

**Files:**
- Create: `scripts/generate-poses.mjs`
- Modify: `.gitignore` (aggiungi riga `scripts/poses-out/`)

- [ ] **Step 5.1: Crea lo script (genera + upload, due modalità)**

```js
// Genera la LIBRERIA POSE (manichini) per ECHO con gpt-image-2 text-to-image.
// Il manichino è un soggetto sintetico NEUTRO (nessuna identità, nessun volto):
// definisce solo la posa. Stesso soggetto in tutte le immagini = libreria coerente.
//
// USO:
//   node --env-file=.env.local scripts/generate-poses.mjs                → genera TUTTE in scripts/poses-out/
//   node --env-file=.env.local scripts/generate-poses.mjs --only walking → rigenera una sola posa
//   node --env-file=.env.local scripts/generate-poses.mjs --upload       → carica scripts/poses-out/*.png su assets/poses/
//
// Le pose si APPROVANO prima dell'upload: si genera, Morelz guarda, le scarse
// si rigenerano con --only, poi --upload carica ciò che è rimasto nella cartella.
import { writeFile, readFile, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const OUT_DIR = resolve("scripts", "poses-out");

const POSES = [
  ["standing-front", "standing straight facing the camera, arms relaxed at the sides"],
  ["three-quarter", "standing in a three-quarter turn, weight on one leg, relaxed fashion stance"],
  ["walking", "captured mid-stride walking forward, one leg ahead, natural arm swing"],
  ["arms-crossed", "standing facing the camera with arms crossed over the chest"],
  ["hands-in-pockets", "standing with both hands in trouser pockets, confident relaxed stance"],
  ["sitting-stool", "sitting on a tall stool, one foot on the footrest, upright posture"],
  ["leaning-wall", "leaning sideways against a plain wall with one shoulder, ankles crossed"],
  ["profile", "standing in full side profile, looking straight ahead"],
  ["hand-on-chin", "standing with one arm folded and the other hand raised to the chin, thoughtful pose"],
  ["legs-crossed-standing", "standing with one leg crossed in front of the other, one hand on the hip"],
  ["sitting-floor", "sitting on the floor with one knee up and an arm resting on the knee"],
  ["arms-open", "standing with both arms open wide, expressive fashion pose"],
];

const promptFor = (desc) =>
  `A faceless articulated grey tailor's mannequin (full body, matte grey material, no face, no hair, visible joints) ${desc}. ` +
  `Full body visible from head to toe, centered, plain pure white studio background, soft even lighting, ` +
  `minimal catalog photography style. No text, no props unless the pose requires one (stool, wall).`;

async function generateAll(only) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) { console.error("ERRORE: OPENAI_API_KEY assente. Avvia con --env-file=.env.local"); process.exit(1); }
  await mkdir(OUT_DIR, { recursive: true });
  const list = only ? POSES.filter(([slug]) => slug === only) : POSES;
  if (list.length === 0) { console.error(`Posa sconosciuta: ${only}`); process.exit(1); }
  for (const [slug, desc] of list) {
    process.stdout.write(`→ ${slug} … `);
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-2", prompt: promptFor(desc), size: "1024x1536", quality: "medium", n: 1 }),
    });
    const text = await res.text();
    if (!res.ok) { console.error(`ERRORE ${res.status}\n${text.slice(0, 600)}`); process.exit(1); }
    const json = JSON.parse(text);
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) { console.error("Nessuna immagine nella risposta:", JSON.stringify(json).slice(0, 400)); process.exit(1); }
    const out = resolve(OUT_DIR, `${slug}.png`);
    await writeFile(out, Buffer.from(b64, "base64"));
    console.log(`OK → ${out}`);
  }
  console.log(`\nFatto. Guarda le immagini in ${OUT_DIR}: elimina/rigenera (--only <slug>) le scarse, poi --upload.`);
}

async function uploadAll() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Mancano NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }
  const sb = createClient(url, key);
  const { data: bucket } = await sb.storage.getBucket("assets");
  if (!bucket) await sb.storage.createBucket("assets", { public: true });
  const files = (await readdir(OUT_DIR)).filter((f) => f.endsWith(".png"));
  if (files.length === 0) { console.error(`Nessun PNG in ${OUT_DIR}: genera prima.`); process.exit(1); }
  for (const f of files) {
    const buf = await readFile(resolve(OUT_DIR, f));
    const { error } = await sb.storage.from("assets").upload(`poses/${f}`, buf, { contentType: "image/png", upsert: true, cacheControl: "3600" });
    if (error) { console.error(`Errore upload ${f}:`, error.message); process.exit(1); }
    console.log(`OK poses/${f} (${Math.round(buf.length / 1024)} KB)`);
  }
  console.log(`\nLibreria aggiornata: ${files.length} pose su assets/poses/.`);
}

const args = process.argv.slice(2);
if (args.includes("--upload")) await uploadAll();
else await generateAll(args[args.indexOf("--only") + 1] && args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined);
```

- [ ] **Step 5.2: Gitignore output**

In `.gitignore` aggiungi la riga `scripts/poses-out/` (i PNG vivono su storage, non nel repo).

- [ ] **Step 5.3: Genera il set (~12 img, qualità medium, costo stimato ~€0,5-1)**

Run: `node --env-file=.env.local scripts/generate-poses.mjs`
Expected: 12 file in `scripts/poses-out/`. ⚠️ Se OpenAI risponde `insufficient_quota`/errore billing: STOP, avvisare Morelz (balance era ~$2,63 al 2026-06-08 e i repertori ambassador ne hanno consumato).

- [ ] **Step 5.4: 🧑 CHECKPOINT MORELZ — approvazione pose**

Mostrare le 12 immagini a Morelz (griglia o elenco percorsi). Lui approva/boccia; le bocciate si rigenerano con `--only <slug>` o si eliminano dalla cartella. NON si carica nulla prima del suo ok.

- [ ] **Step 5.5: Upload delle approvate**

Run: `node --env-file=.env.local scripts/generate-poses.mjs --upload`
Expected: `OK poses/<slug>.png` per ogni posa approvata.

- [ ] **Step 5.6: Verifica libreria live**

Run: `curl -s http://localhost:3000/api/poses`
Expected: JSON con N pose `{id, label, url}`, label in italiano (dalla mappa di `lib/poses.ts`). NB: se si aggiungono slug nuovi non in mappa, la label è lo slug umanizzato — accettabile.

---

### Task 6: Verifica E2E + build + commit unico

- [ ] **Step 6.1: E2E UI completa (1 generazione reale, ~€0,26)**

Prerequisiti: dev server + worker attivi (`npm run dev` e `node --env-file=.env.local worker/poll.mjs`), login con `test-card-e3@h2ai.dev`.
Flusso: /match → trova Random → ECHO → slot 1: carica un capo (qualsiasi immagine outfit) → slot 2: «Posa dalla libreria» → scegli es. «Braccia conserte» → genera (commerciale, async).
Expected: immagine finale con identità di Random INTATTA, outfit applicato, POSA del manichino rispettata. Verificare visivamente.

- [ ] **Step 6.2: Regressione — generazione senza posa**

Stessa scena SENZA posa (anche solo preview): flusso identico a prima del modulo, nessun errore, prompt invariato (controllare nei log server che senza `poseId` non compaia la clausola mannequin).

- [ ] **Step 6.3: Build di produzione**

Run: `npm run build`
Expected: build verde, la nuova rotta `/api/poses` compare nell'elenco rotte.

- [ ] **Step 6.4: Commit UNICO del modulo (niente push)**

```bash
git add lib/poses.ts app/api/poses/route.ts app/api/generate/route.ts lib/echo-job.ts app/match/MatchClient.tsx scripts/generate-poses.mjs .gitignore docs/superpowers/
git commit -F <file-messaggio>
```

Messaggio (via `git commit -F`, lezione PowerShell: niente doppi apici inline):

```
feat: libreria pose (manichini) per ECHO

Il compratore sceglie una posa da una libreria di manichini pre-generati
(assets/poses/ su storage, zero migrazioni): la posa occupa uno dei 2 slot
extra con ruolo dedicato e guida il corpo, mai l identita. Nuova rotta
GET /api/poses, risoluzione poseId server-side prima dei percorsi sync e
worker, picker a griglia in MatchClient, script generate-poses.mjs
(genera + upload con approvazione manuale).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

PUSH: NO. Si pusha solo al «pubblica» di Morelz.

---

## Rischi e note

- **Moderazione OpenAI:** i manichini sono soggetti sintetici neutri → rischio blocco input quasi nullo; la moderazione resta probabilistica (lezione ambassador), eventuale blocco su una posa → riformulare la descrizione.
- **Credito OpenAI:** stimati ~€0,5-1 per il set + ~€0,26 per l'E2E. Verificare il balance prima di partire (step 5.3).
- **Slot contesi:** se l'utente carica 2 immagini e POI una posa non può succedere (il bottone posa appare solo su box vuoto e sparisce a posa scelta); lato server comunque `extraRefs.slice(0, 1)` garantisce 1 upload + 1 posa max.
- **Cache `/api/poses`:** 5 min CDN → una posa caricata può tardare a comparire in prod; in locale è immediato.
