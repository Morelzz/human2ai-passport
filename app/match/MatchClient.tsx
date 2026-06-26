"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Tier, CATEGORIES } from "@/lib/types";
import { formatEur, grossForCategory, grossForEcho } from "@/lib/wallet";
import { echoSurchargeCents } from "@/lib/engines/echo-cost";
import { KineticText } from "@/components/motion/KineticText";
// Motore Higgsfield/Soul rimosso dalla UI: ECHO (gpt-image-2) e' l'unico motore.
import { voltStr, VOLT_STRINGS, voltLoadingLine, voltSuccessMission } from "@/lib/strings/volt";
import { StudioPanel } from "@/app/match/studio/StudioPanel";
import { AgeGateModal } from "./AgeGateModal";
import type { FramingVal, ExpressionVal, LightVal, ColorStyleVal, LensVal, CameraVal } from "@/lib/studio-options";
// Token-helper per dare all'enhancer le scelte gia fatte coi controlli (le tiene
// coerenti nella scena, senza ripeterle come direttive: quelle le aggiunge il server).
import { poseToken, framingToken, expressionToken, colorStyleToken, cameraToken, lensToken, lightToken } from "@/lib/studio-options";
import { describeDirection, type StudioDirection } from "@/lib/voice/studio-interpret";
import { DictateButton } from "@/components/voice/DictateButton";
import { joinScene } from "@/lib/voice/dictation";

const FMT_VOLT = new Intl.NumberFormat("it-IT");

// ECHO (gpt-image-2): Formato × Risoluzione → dimensione in pixel valida per l'API.
// Il quadrato non ha 4K (supererebbe il limite di pixel del modello).
const ECHO_SIZE_GRID: Record<string, Record<string, string>> = {
  quadrato:    { standard: "1024x1024", "2k": "2048x2048" },
  verticale:   { standard: "1024x1536", "2k": "1440x2560", "4k": "2160x3840" },
  orizzontale: { standard: "1536x1024", "2k": "2560x1440", "4k": "3840x2160" },
};
const ECHO_FORMATS = [
  { v: "quadrato", l: "Quadrato" },
  { v: "verticale", l: "Verticale" },
  { v: "orizzontale", l: "Orizzontale" },
];
const ECHO_RESES = [
  { v: "standard", l: "Standard" },
  { v: "2k", l: "2K" },
  { v: "4k", l: "4K" },
];
const ECHO_QUALS = [
  { v: "low", l: "Bassa" },
  { v: "medium", l: "Media" },
  { v: "high", l: "Alta" },
];

// --- Opzioni dell'identikit (chip cliccabili) ---
const GENDERS = [
  { v: "uomo", l: "Uomo" },
  { v: "donna", l: "Donna" },
];
const HAIRS = ["Neri", "Castani", "Biondi", "Rossi", "Grigi", "Rasati", "Calvo"];
const ETHNICITIES = ["Italiana", "Giapponese", "Cinese", "Indiana", "Nigeriana", "Afroamericana", "Caucasica", "Latina", "Araba"];
// Filtri avanzati: stesso vocabolario di IDENTITY_KIT (lib/types.ts) — i valori
// devono combaciare con quelli salvati alla creazione avatar.
const EYES = ["Marroni", "Neri", "Azzurri", "Verdi", "Grigi", "Nocciola"];
const HEIGHTS = [{ v: "bassa", l: "Bassa" }, { v: "media", l: "Media" }, { v: "alta", l: "Alta" }];
const BUILDS = [{ v: "slim", l: "Slim" }, { v: "atletico", l: "Atletica" }, { v: "normale", l: "Normale" }, { v: "curvy", l: "Curvy" }, { v: "robusto", l: "Robusta" }];

interface Attrs {
  gender: string | null;
  ethnicity: string | null;
  hair_color: string | null;
  age_min: number | null;
  age_max: number | null;
  eye_color?: string | null;
  height?: string | null;
  body_type?: string | null;
}

interface MatchAvatar {
  handle: string;
  alias: string;
  portrait_url: string | null;
  tier: Tier;
  reasons: string[];
  gallery_count: number;
}

interface MatchResponse {
  matched: boolean;
  attrs: Attrs;
  category: string | null;
  reason?: string;
  results?: MatchAvatar[];
}

interface GenResult {
  mode: "preview" | "commercial";
  alias: string;
  image_url?: string;
  image_data?: string;
  certificate?: string;
  category?: string | null;
  gross_cents?: number;
  fee_cents?: number;
  royalty_cents?: number;
  surcharge_cents?: number;
  size?: string;
  // VOLT: spesa e saldo dopo la generazione (assenti se sistema non configurato)
  volt?: { spent: number; balance: number | null };
  voltMission?: string | null;
}

// Guardia fotorealismo (ECHO): termini che spingono verso uno stile NON reale e
// che farebbero perdere l'identità del volto (e sprecare una generazione). Se
// l'utente li usa con ECHO, lo avvisiamo PRIMA di pagare.
const NON_PHOTOREAL_TERMS = [
  "anime", "manga", "cartoon", "cartone", "fumetto", "comic", "comics",
  "illustrazione", "illustration", "disegno", "drawing", "sketch", "schizzo",
  "dipinto", "painting", "pittura", "acquerello", "watercolor",
  "render", "3d", "pixar", "disney", "pixel", "low poly", "lowpoly",
  "caricatura", "caricature", "statua", "scultura", "origami", "lego",
  "plastilina", "claymation", "cel shading", "cel-shading", "voxel",
];
function detectNonPhotoreal(scene: string): string[] {
  const s = " " + scene.toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
  return NON_PHOTOREAL_TERMS.filter((t) => s.includes(" " + t + " "));
}

// Ridimensiona un'immagine scelta dall'utente a max 1024px e ritorna un data-URL
// JPEG: payload leggero (sotto i limiti del server) e veloce da inviare.
function resizeImage(file: File, maxDim = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src = url;
  });
}

export default function MatchClient({ initialHandle = null }: { initialHandle?: string | null }) {
  // Passo 1 — CHI. Review D1: il BRIEF in linguaggio naturale è il centro
  // della ricerca; i filtri classici restano come raffinamento alternativo.
  const [brief, setBrief] = useState("");
  const [gender, setGender] = useState("");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(100);
  const [hair, setHair] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [eyes, setEyes] = useState("");
  const [height, setHeight] = useState("");
  const [build, setBuild] = useState("");
  const [category, setCategory] = useState("");
  // D3 — stato del salvataggio "avvisami" sull'empty state.
  const [alertState, setAlertState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);
  // Selezione: il compratore "blocca" UN volto tra i risultati → la vista si
  // concentra su di lui (gli altri spariscono finché non torna alla lista).
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);

  // Passo 2 — SCENA: direzione artistica libera, per ogni avatar trovato
  const [sceneByHandle, setSceneByHandle] = useState<Record<string, string>>({});
  const [generatingHandle, setGeneratingHandle] = useState<string | null>(null);
  // A1 Prompt Enhancer: proposta di scena migliorata per avatar (mai automatica).
  const [enhancingHandle, setEnhancingHandle] = useState<string | null>(null);
  const [enhancedByHandle, setEnhancedByHandle] = useState<Record<string, string | null>>({});
  // Regia vocale: la descrizione (parlata o scritta) imposta i controlli dello
  // Studio in un colpo. composedByHandle tiene l'esito (etichette mostrate +
  // snapshot dei controlli PRIMA della regia, per l'Annulla). I controlli sono
  // globali (un avatar per volta): lo snapshot e' uno solo, sull'handle attivo.
  type ControlsSnap = { pose: string; framing: string; expression: string; colorStyle: string; camera: string; lens: string; light: string };
  const [composingHandle, setComposingHandle] = useState<string | null>(null);
  const [composedByHandle, setComposedByHandle] = useState<Record<string, { labels: string[]; snap: ControlsSnap } | null>>({});
  const [genByHandle, setGenByHandle] = useState<Record<string, GenResult>>({});
  // VOLT: saldo per il preview costo (null = sistema non configurato), gate
  // di saldo insufficiente (4.7) e riga di loading "elettrica" (4.5).
  const [voltBalance, setVoltBalance] = useState<number | null>(null);
  const [voltGate, setVoltGate] = useState<{ needed: number; missing: number; balance: number } | null>(null);
  const [ageGate, setAgeGate] = useState(false);
  const [loadingLine, setLoadingLine] = useState("Generazione…");

  useEffect(() => {
    fetch("/api/volt")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.configured) setVoltBalance(d.balance); })
      .catch(() => {});
  }, []);

  // CTA "Genera con questo avatar" (dal passport): carica direttamente il
  // volto in modalità selezionata, senza brief, e porta l'utente ai risultati.
  useEffect(() => {
    if (!initialHandle) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: initialHandle }),
        });
        const json = await res.json();
        if (res.ok && json.matched) {
          setResult(json);
          setSelectedHandle(initialHandle);
          // Lenis sovrascrive gli scroll nativi: si usa la sua istanza. Cintura:
          // se l'animazione non parte (RAF sospeso, ambienti headless), dopo un
          // attimo si scatta con lo scroll nativo istantaneo.
          setTimeout(() => {
            const lenis = (window as Window & { __lenis?: { scrollTo: (t: string, o?: { offset?: number }) => void } }).__lenis;
            if (lenis) lenis.scrollTo("#risultati", { offset: -90 });
            else document.getElementById("risultati")?.scrollIntoView({ behavior: "smooth", block: "start" });
            setTimeout(() => {
              if (window.scrollY < 50) document.getElementById("risultati")?.scrollIntoView({ block: "start" });
            }, 1000);
          }, 350);
        } else {
          setError(json.error ?? "Avatar non disponibile");
        }
      } catch {
        setError("Errore di rete, riprova");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHandle]);

  // Impostazioni di generazione ECHO (formato, risoluzione, qualità, immagini extra).
  // ECHO (gpt-image-2) e' l'unico motore: nessuna scelta Higgsfield/Soul.
  const engine = "echo" as const;
  const [echoFormat, setEchoFormat] = useState("quadrato");
  const [echoRes, setEchoRes] = useState("standard");
  const [echoQuality, setEchoQuality] = useState("high");
  const echoSize = ECHO_SIZE_GRID[echoFormat]?.[echoRes] ?? ECHO_SIZE_GRID[echoFormat]?.["2k"] ?? "1024x1024";
  // ECHO: fino a 2 immagini extra del cliente. Ogni box ha un RUOLO: noi
  // colleghiamo l'immagine al soggetto in automatico, l'utente non scrive nulla.
  // I riferimenti sono SOLO immagini del cliente (la posa è un controllo a sé,
  // il PosePicker, e non vive più dentro questi slot).
  type EchoRef = { dataUrl: string; desc: string; role: string } | undefined;
  const [echoRefs, setEchoRefs] = useState<EchoRef[]>([]);

  // Nuove selezioni dello Studio (usato dai task successivi): obiettivo, posa
  // e parametri fotografici. Dichiarate ora con i tipi letterali di
  // lib/studio-options; il wiring nel prompt (segmento fotografico via
  // whitelist server) arriva nei task successivi. Passate a StudioPanel come
  // props ("uso") per non far scattare le regole no-unused-vars.
  const [goal, setGoal] = useState<string | null>(null);
  const [pose, setPose] = useState("nessuna");
  const [framing, setFraming] = useState<FramingVal>("mezzo_busto");
  const [expression, setExpression] = useState<ExpressionVal>("naturale");
  const [colorStyle, setColorStyle] = useState<ColorStyleVal>("naturale");
  const [camera, setCamera] = useState<CameraVal>("full_frame");
  const [lens, setLens] = useState<LensVal>("85mm");
  const [light, setLight] = useState<LightVal>("naturale");

  async function pickEcho(i: number, file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setEchoRefs((prev) => {
        const next = [...prev];
        const otherIsOutfit = prev.some((r, j) => j !== i && r?.role === "outfit");
        const existing = next[i]?.role;
        // Mai due outfit: se l'altro slot e' gia' outfit, questo slot ripiega su "sfondo".
        const role =
          existing && !(existing === "outfit" && otherIsOutfit)
            ? existing
            : otherIsOutfit
              ? "sfondo"
              : i === 0
                ? "outfit"
                : "sfondo";
        next[i] = { dataUrl, desc: next[i]?.desc ?? "", role };
        return next;
      });
    } catch {
      /* immagine non leggibile */
    }
  }
  function updateEcho(i: number, patch: Partial<NonNullable<EchoRef>>) {
    setEchoRefs((prev) => {
      const next = [...prev];
      if (next[i]) next[i] = { ...next[i]!, ...patch };
      return next;
    });
  }
  function removeEcho(i: number) {
    setEchoRefs((prev) => {
      const next = [...prev];
      next[i] = undefined;
      return next;
    });
  }
  // Ricomincia: torna al form per scrivere una NUOVA scena e nuove immagini.
  function resetGeneration(handle: string) {
    setGenByHandle((m) => { const n = { ...m }; delete n[handle]; return n; });
    setSceneByHandle((m) => { const n = { ...m }; delete n[handle]; return n; });
    setEchoRefs([]);
  }
  // model/styleId/stili Soul rimossi: ECHO non ha modelli ne stili.

  const toggle = (cur: string, v: string, set: (s: string) => void) => set(cur === v ? "" : v);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    // Età: il range completo 18–100 = "indifferente" (nessun filtro).
    const ageActive = ageMin > 18 || ageMax < 100;
    const hasChips = Boolean(gender || ethnicity || hair || eyes || height || build || ageActive);
    const text = brief.trim();
    if (!hasChips && text.length < 5 && !category) {
      setError("Descrivi chi cerchi, oppure usa i filtri avanzati o una categoria d'uso.");
      return;
    }
    // D1: la descrizione libera passa dal matching engine (Claude estrae gli
    // attributi). Se selezioni i filtri avanzati, sono LORO a comandare.
    // La categoria resta SEMPRE esplicita: il consenso è deliberato, mai inferito.
    const body = !hasChips && text.length >= 5
      ? { prompt: text, category: category || null }
      : {
          identity: {
            gender: gender || null,
            ethnicity: ethnicity || null,
            hair_color: hair || null,
            age_min: ageActive ? ageMin : null,
            age_max: ageActive ? ageMax : null,
            eye_color: eyes || null,
            height: height || null,
            body_type: build || null,
          },
          category: category || null,
        };
    setLoading(true);
    setError(null);
    setResult(null);
    setGenByHandle({});
    setSelectedHandle(null);
    setAlertState("idle");
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    setResult(json);
  }

  // D3 — salva la ricerca senza match come domanda reale ("avvisami quando
  // entra un volto compatibile"). Usa gli attributi già normalizzati dal server.
  async function saveAlert() {
    if (!result) return;
    setAlertState("saving");
    try {
      const res = await fetch("/api/match/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attrs: result.attrs, category: result.category }),
      });
      if (res.ok) { setAlertState("saved"); return; }
      const j = await res.json().catch(() => null);
      setError(j?.error ?? "Salvataggio non riuscito");
      setAlertState("error");
    } catch {
      setError("Salvataggio non riuscito, riprova");
      setAlertState("error");
    }
  }

  async function generate(handle: string, mode: "preview" | "commercial") {
    setGeneratingHandle(handle);
    setError(null);
    setVoltGate(null);
    setLoadingLine(voltLoadingLine());
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle,
        mode,
        category: category || null,
        scene: sceneByHandle[handle] ?? "",
        engine,
        echoSize,
        echoQuality,
        extraRefs: engine === "echo"
          ? echoRefs
              .filter((r): r is NonNullable<EchoRef> => !!r?.dataUrl)
              .map((r) => ({ data: r.dataUrl, desc: r.desc, role: r.role }))
          : undefined,
        // Selezioni fotografiche dello Studio: il server le valida su whitelist
        // (lib/studio-options) e le compone nel prompt finale (mai testo libero
        // come parametro). `pose` (enum) sostituisce il vecchio poseId-da-libreria.
        pose,
        framing,
        expression,
        colorStyle,
        camera,
        lens,
        light,
        // ECHO non ha stili Soul: il campo resta null per compatibilità.
        styleId: null,
      }),
    });
    const json = await res.json();
    // Saldo VOLT insufficiente (402): gate dedicato, mai punitivo (4.7).
    if (res.status === 402 && json.volt) {
      setGeneratingHandle(null);
      setVoltGate(json.volt);
      return;
    }
    if (res.status === 403 && json.code === "age_unverified") {
      setGeneratingHandle(null);
      setAgeGate(true);
      return;
    }
    if (!res.ok) {
      setGeneratingHandle(null);
      setError(json.error ?? "Errore");
      // Generazione morta dopo la spesa: il server ha stornato, allinea il badge.
      if (json.volt_refunded) {
        window.dispatchEvent(new Event("volt:refetch"));
        setError(`${json.error ?? "Errore"} ${voltStr("gen.refund.toast", { n: FMT_VOLT.format(json.volt_refunded) })}`);
      }
      return;
    }
    // Spesa riuscita: badge aggiornato senza refresh (VOLT_SYSTEM §2).
    if (json.volt) {
      setVoltBalance(json.volt.balance);
      window.dispatchEvent(new CustomEvent("volt:update", { detail: { balance: json.volt.balance } }));
    }
    // ECHO commerciale = ASINCRONO: il server ha messo in coda un job, un worker
    // lo genera (può durare minuti). Restiamo "in lavorazione" e interroghiamo lo
    // stato finché non è pronto. L'utente può anche lasciare la pagina e tornare.
    if (json.mode === "async" && json.jobId) {
      await pollJob(handle, json.jobId, json.alias ?? "", json.volt);
      return;
    }
    setGeneratingHandle(null);
    setGenByHandle((m) => ({ ...m, [handle]: { ...json, voltMission: json.volt ? voltSuccessMission(json.alias ?? "") : null } }));
  }

  // A1 — chiede a Claude una versione migliorata della scena (solo su click).
  // La proposta appare evidenziata: l'utente la usa, la modifica o la ignora.
  async function enhance(handle: string) {
    const scene = (sceneByHandle[handle] ?? "").trim();
    if (!scene) return;
    setEnhancingHandle(handle);
    setError(null);
    // Scelte gia fatte coi controlli (posa, inquadratura, espressione, stile,
    // macchina, ottica, luce) + descrizioni delle immagini di riferimento. Le
    // passiamo all'enhancer come CONTESTO: deve tenere la scena coerente con
    // queste, ma NON ripeterle come direttive fotografiche (le aggiunge il
    // server in /api/generate). Per questo il bottone sta in fondo.
    const photo = [
      poseToken(pose), framingToken(framing), expressionToken(expression),
      colorStyleToken(colorStyle), cameraToken(camera), lensToken(lens), lightToken(light),
    ].filter(Boolean);
    const refs = echoRefs
      .filter((r): r is NonNullable<EchoRef> => !!r?.dataUrl)
      .map((r) => [r.role, r.desc].filter(Boolean).join(": "))
      .filter(Boolean);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, category: category || null, photo, refs }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Miglioramento non riuscito");
      else setEnhancedByHandle((m) => ({ ...m, [handle]: json.enhanced }));
    } catch {
      setError("Miglioramento non riuscito, riprova");
    }
    setEnhancingHandle(null);
  }

  // Regia vocale: manda la descrizione (parlata o scritta) a /api/studio/interpret
  // e applica le scelte ai controlli in un colpo. Salva uno snapshot dei controlli
  // PRIMA, cosi' l'Annulla li ripristina. La scena resta come l'ha scritta l'utente.
  async function composeFromVoice(handle: string) {
    const text = (sceneByHandle[handle] ?? "").trim();
    if (text.length < 3) return;
    setComposingHandle(handle);
    setError(null);
    try {
      const res = await fetch("/api/studio/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const dir = (await res.json()) as StudioDirection & { error?: string };
      if (!res.ok) {
        setError(dir.error ?? "Regia non riuscita");
      } else {
        const labels = describeDirection(dir);
        if (labels.length === 0) {
          setError("Non ho trovato indicazioni da impostare, prova a essere piu' specifico");
        } else {
          // Snapshot dei controlli correnti, poi applico solo i token presenti.
          const snap: ControlsSnap = { pose, framing, expression, colorStyle, camera, lens, light };
          if (dir.pose) setPose(dir.pose);
          if (dir.framing) setFraming(dir.framing as FramingVal);
          if (dir.expression) setExpression(dir.expression as ExpressionVal);
          if (dir.colorStyle) setColorStyle(dir.colorStyle as ColorStyleVal);
          if (dir.camera) setCamera(dir.camera as CameraVal);
          if (dir.lens) setLens(dir.lens as LensVal);
          if (dir.light) setLight(dir.light as LightVal);
          setComposedByHandle((m) => ({ ...m, [handle]: { labels, snap } }));
        }
      }
    } catch {
      setError("Regia non riuscita, riprova");
    }
    setComposingHandle(null);
  }

  // Annulla l'ultima regia: ripristina i controlli allo snapshot pre-regia.
  function undoCompose(handle: string) {
    const c = composedByHandle[handle];
    if (!c) return;
    const s = c.snap;
    setPose(s.pose);
    setFraming(s.framing as FramingVal);
    setExpression(s.expression as ExpressionVal);
    setColorStyle(s.colorStyle as ColorStyleVal);
    setCamera(s.camera as CameraVal);
    setLens(s.lens as LensVal);
    setLight(s.light as LightVal);
    setComposedByHandle((m) => ({ ...m, [handle]: null }));
  }

  // Interroga /api/generate/job/[id] finché il job non è done/error (cap ~20 min,
  // poi rimanda a «I miei contenuti»: il job prosegue comunque lato server).
  async function pollJob(handle: string, jobId: string, alias: string, volt?: GenResult["volt"]) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 20 * 60 * 1000) {
      await new Promise((r) => setTimeout(r, 3000));
      let pj: GenResult & { status?: string; error?: string };
      try {
        const r = await fetch(`/api/generate/job/${jobId}`);
        pj = await r.json();
        if (!r.ok) { setGeneratingHandle(null); setError(pj.error ?? "Errore"); return; }
      } catch {
        continue; // singolo errore di rete: riprova al prossimo giro
      }
      if (pj.status === "done") {
        setGenByHandle((m) => ({ ...m, [handle]: { ...pj, mode: "commercial", alias, volt, voltMission: volt ? voltSuccessMission(alias) : null } }));
        setGeneratingHandle(null);
        return;
      }
      if (pj.status === "error") {
        setGeneratingHandle(null);
        // Job fallito = il worker ha stornato i VOLT: riallinea badge e saldo.
        window.dispatchEvent(new Event("volt:refetch"));
        if (volt?.spent) {
          setVoltBalance((b) => (b === null ? b : b + volt.spent));
          setError(`${pj.error ?? "Generazione non riuscita"}. ${voltStr("gen.refund.toast", { n: FMT_VOLT.format(volt.spent) })}`);
        } else {
          setError(pj.error ?? "Generazione non riuscita");
        }
        return;
      }
      // pending | running → continua a interrogare
    }
    setGeneratingHandle(null);
    // Non è un fallimento: la coda può essere piena. Il job prosegue lato server e
    // comparirà in «I miei contenuti» appena pronto (niente falso "non riuscita").
    setError("La generazione è ancora in corso (la coda può essere piena). Puoi lasciare la pagina: la trovi in «I miei contenuti» appena è pronta.");
  }

  const baseGross = grossForCategory(category || null);
  // ECHO: valore-categoria + supplemento-compute (modello "compute a parte").
  const echoSurcharge = echoSurchargeCents(echoSize, echoQuality);
  const priceCents = engine === "echo" ? grossForEcho(category || null, echoSize, echoQuality) : baseGross;
  const priceLabel = formatEur(priceCents);
  // Etichetta del bottone Genera: il costo vive DENTRO il bottone (VOLT_SYSTEM
  // §4.4); con sistema VOLT non configurato si torna al prezzo in euro.
  const genCta = voltBalance !== null ? voltStr("gen.cta", { n: FMT_VOLT.format(priceCents) }) : `Genera la tua scena · ${priceLabel}`;

  // Gate saldo insufficiente (4.7): mai punitivo, numeri sempre espliciti.
  const voltGatePanel = voltGate ? (
    <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
      <p className="text-sm font-bold text-amber-300">{VOLT_STRINGS["volt.insufficient.title"]}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {voltStr("volt.insufficient.body", { n: FMT_VOLT.format(voltGate.needed), delta: FMT_VOLT.format(voltGate.missing) })}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link href="/account/volt" className="rounded-full bg-[#F2A93B] px-4 py-2 text-xs font-bold text-on-amber transition-all hover:brightness-110">
          {VOLT_STRINGS["volt.insufficient.cta"]}
        </Link>
        <button type="button" onClick={() => setVoltGate(null)} className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted transition-colors hover:text-foreground">
          {VOLT_STRINGS["volt.insufficient.secondary"]}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14 lg:max-w-4xl">
      {/* Kicker in stile HUD: stato del registro + passo corrente */}
      <div className="flex items-center gap-2.5 font-mono text-[0.68rem] font-bold tracking-[0.14em]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
        </span>
        <span className="text-teal">REGISTRO ATTIVO</span>
        <span className="text-faint">/</span>
        <span className="text-violet-light">PASSO 1: CHI</span>
      </div>
      <h1 className="mt-2 text-4xl font-extralight tracking-[-0.04em] sm:text-5xl">
        <KineticText text="Descrivi chi cerchi" />
      </h1>
      <p className="mt-2 mb-6 text-sm leading-relaxed text-muted sm:text-base">
        Scrivi il tuo brief come lo diresti a un&apos;agenzia: il matching trova la{" "}
        <span className="text-foreground">persona reale e consenziente</span> più affine nel registro.
        La <em>scena</em> la dirigi dopo.
      </p>

      {/* Hairline tramonto, lo stesso filo di passport e catalogo */}
      <div aria-hidden className="mb-8 h-px" style={{ background: "linear-gradient(90deg, rgba(242,169,59,0.5), var(--hairline) 34%, transparent 72%)" }} />

      <form onSubmit={search} className="flex flex-col gap-6">
        {/* Review D1 — il brief in linguaggio naturale al centro */}
        <div>
          <label htmlFor="brief" className="mb-2 block text-xs font-bold tracking-[0.1em] text-violet-light">IL TUO BRIEF</label>
          {/* Palco del brief: il centro della pagina. Bordo amber tenue + glow
              d'angolo; al focus il bordo si accende. La textarea e' trasparente
              dentro al palco (il bordo lo da il contenitore). */}
          <div className="relative rounded-2xl border border-violet/25 bg-obsidian transition-colors focus-within:border-violet/50">
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: "radial-gradient(60% 80% at 100% 0%, rgba(242,169,59,0.10), transparent 60%)" }} />
            <textarea
              id="brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={'Es. "donna 30-40, mediterranea, sorriso naturale, capelli castani"'}
              rows={3}
              className="relative w-full resize-y border-none bg-transparent px-4 py-3.5 text-base text-foreground outline-none"
            />
          </div>
          {/* Dettatura del brief: parli chi cerchi invece di scriverlo. Stesso
              microfono push-to-talk dello Studio; su browser senza Web Speech
              non rende nulla, il brief resta scrivibile a mano. */}
          <DictateButton idleHint="Detta il tuo brief a voce" onText={(chunk) => setBrief((b) => joinScene(b, chunk))} />
          {/* Review D4 — principio vincolante, dichiarato dove serve */}
          <p className="mt-2 text-[0.7rem] leading-relaxed text-faint">
            Qui si <span className="text-muted">descrive</span>, non si carica: nessuna ricerca per
            somiglianza da una foto, mai. Il volto di un altro non è una chiave di ricerca.
          </p>
        </div>

        <ChipGroup label="Categoria d'uso" hint="esplicita: determina prezzo e consenso">
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => toggle(category, c, setCategory)}>{c}</Chip>
          ))}
        </ChipGroup>

        {/* Filtri avanzati: raffinamento opzionale, in alternativa al brief */}
        <details className="group rounded-2xl border border-border bg-obsidian-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-muted transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span>Filtri avanzati <span className="font-normal text-faint">· in alternativa alla descrizione</span></span>
            <span aria-hidden className="text-faint transition-transform duration-300 group-open:rotate-180">⌄</span>
          </summary>
          <div className="flex flex-col gap-6 border-t border-border p-4">
            <ChipGroup label="Genere">
              {GENDERS.map((g) => (
                <Chip key={g.v} active={gender === g.v} onClick={() => toggle(gender, g.v, setGender)}>{g.l}</Chip>
              ))}
            </ChipGroup>

            <div>
              <div className="mb-2.5 flex items-baseline gap-2">
                <span className="text-sm font-semibold text-muted">Età</span>
                <span className="text-[0.7rem] text-faint">· dai {ageMin} ai {ageMax >= 100 ? "100+" : ageMax} anni</span>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-obsidian p-4">
                <label className="flex items-center gap-3">
                  <span className="w-7 text-[0.7rem] text-faint">Da</span>
                  <input type="range" min={18} max={100} value={ageMin}
                    onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax))}
                    className="h-1.5 flex-1 cursor-pointer accent-[#F2A93B]" />
                  <span className="w-9 text-right text-sm font-bold">{ageMin}</span>
                </label>
                <label className="flex items-center gap-3">
                  <span className="w-7 text-[0.7rem] text-faint">A</span>
                  <input type="range" min={18} max={100} value={ageMax}
                    onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin))}
                    className="h-1.5 flex-1 cursor-pointer accent-[#F2A93B]" />
                  <span className="w-9 text-right text-sm font-bold">{ageMax >= 100 ? "100+" : ageMax}</span>
                </label>
              </div>
            </div>

            <ChipGroup label="Capelli">
              {HAIRS.map((h) => (
                <Chip key={h} active={hair === h.toLowerCase()} onClick={() => toggle(hair, h.toLowerCase(), setHair)}>{h}</Chip>
              ))}
            </ChipGroup>

            <ChipGroup label="Etnia">
              {ETHNICITIES.map((e) => (
                <Chip key={e} active={ethnicity === e.toLowerCase()} onClick={() => toggle(ethnicity, e.toLowerCase(), setEthnicity)}>{e}</Chip>
              ))}
            </ChipGroup>

            <ChipGroup label="Occhi">
              {EYES.map((o) => (
                <Chip key={o} active={eyes === o.toLowerCase()} onClick={() => toggle(eyes, o.toLowerCase(), setEyes)}>{o}</Chip>
              ))}
            </ChipGroup>

            <ChipGroup label="Statura">
              {HEIGHTS.map((h) => (
                <Chip key={h.v} active={height === h.v} onClick={() => toggle(height, h.v, setHeight)}>{h.l}</Chip>
              ))}
            </ChipGroup>

            <ChipGroup label="Corporatura">
              {BUILDS.map((b) => (
                <Chip key={b.v} active={build === b.v} onClick={() => toggle(build, b.v, setBuild)}>{b.l}</Chip>
              ))}
            </ChipGroup>

            <p className="text-[0.68rem] leading-relaxed text-faint">
              Con un filtro selezionato la ricerca usa <span className="text-muted">i filtri</span> e
              ignora la descrizione scritta sopra.
            </p>
          </div>
        </details>

        <button type="submit" disabled={loading}
          className="mt-1 rounded-xl bg-[#F2A93B] px-6 py-3.5 text-sm font-bold text-[#412402] shadow-[0_8px_40px_rgba(242,169,59,0.35)] transition-all hover:brightness-110 disabled:opacity-50">
          {loading ? "Ricerca in corso…" : "Cerca avatar affine"}
        </button>
      </form>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-crimson/40 bg-crimson/10 p-4 text-sm font-medium text-crimson">
          <span aria-hidden>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-8" id="risultati">
          {result.matched && result.results && result.results.length > 0 ? (
            <>
              <p className="mb-1.5 font-mono text-sm font-bold tracking-wide text-teal">
                <span className="text-faint">&gt;</span>{" "}
                {selectedHandle
                  ? <>VOLTO SELEZIONATO · {result.results?.find((a) => a.handle === selectedHandle)?.alias?.toUpperCase()}</>
                  : <>SCANSIONE COMPLETATA · {result.results.length} {result.results.length === 1 ? "VOLTO CONSENZIENTE TROVATO" : "VOLTI CONSENZIENTI TROVATI"}</>}
              </p>
              {selectedHandle && (
                <button
                  type="button"
                  onClick={() => setSelectedHandle(null)}
                  className="mb-3 rounded-full border border-border px-3 py-1 text-[0.7rem] font-semibold text-muted transition-colors hover:border-teal/40 hover:text-teal"
                >
                  ← Tutti i risultati ({result.results.length})
                </button>
              )}
              {/* D1 — come il matching ha letto il brief (attributi normalizzati dal server) */}
              {(() => {
                const a = result.attrs;
                const parts = [
                  a.gender,
                  a.ethnicity,
                  a.hair_color && `capelli ${a.hair_color}`,
                  a.eye_color && `occhi ${a.eye_color}`,
                  a.height && `statura ${a.height}`,
                  a.body_type && `corporatura ${a.body_type}`,
                  (a.age_min != null || a.age_max != null) && `${a.age_min ?? 18}-${a.age_max ?? "100+"} anni`,
                  result.category,
                ].filter(Boolean) as string[];
                return parts.length > 0 ? (
                  <p className="mb-4 text-xs text-faint">Ho letto: <span className="text-muted">{parts.join(" · ")}</span></p>
                ) : <span className="mb-4 block" />;
              })()}
              <div className="flex flex-col gap-4">
                {(selectedHandle ? result.results.filter((a) => a.handle === selectedHandle) : result.results).map((avatar) => {
                  const gen = genByHandle[avatar.handle];
                  const generating = generatingHandle === avatar.handle;
                  // Guardia fotorealismo: termini non-reali nel prompt + motore ECHO.
                  const styleRisk = engine === "echo" ? detectNonPhotoreal(sceneByHandle[avatar.handle] ?? "") : [];
                  // Pannello di generazione (Task 5): JSX rilocato in StudioPanel.
                  // TUTTA la logica resta qui sopra (generate/pollJob/enhance/
                  // handler echoRefs/gate VOLT/risultato) e arriva via props.
                  return (
                    <StudioPanel
                      key={avatar.handle}
                      avatar={avatar}
                      category={result.category}
                      setSelectedHandle={setSelectedHandle}
                      gen={gen}
                      generating={generating}
                      loadingLine={loadingLine}
                      sceneByHandle={sceneByHandle}
                      setSceneByHandle={setSceneByHandle}
                      enhance={enhance}
                      enhancingHandle={enhancingHandle}
                      enhancedByHandle={enhancedByHandle}
                      setEnhancedByHandle={setEnhancedByHandle}
                      composeFromVoice={composeFromVoice}
                      composingHandle={composingHandle}
                      composedByHandle={composedByHandle}
                      undoCompose={undoCompose}
                      styleRisk={styleRisk}
                      engine={engine}
                      echoFormat={echoFormat}
                      setEchoFormat={setEchoFormat}
                      echoRes={echoRes}
                      setEchoRes={setEchoRes}
                      echoQuality={echoQuality}
                      setEchoQuality={setEchoQuality}
                      echoSize={echoSize}
                      echoSurcharge={echoSurcharge}
                      echoFormats={ECHO_FORMATS}
                      echoReses={ECHO_RESES}
                      echoQuals={ECHO_QUALS}
                      echoRefs={echoRefs}
                      pickEcho={pickEcho}
                      updateEcho={updateEcho}
                      removeEcho={removeEcho}
                      generate={generate}
                      resetGeneration={resetGeneration}
                      voltBalance={voltBalance}
                      priceCents={priceCents}
                      genCta={genCta}
                      voltGatePanel={voltGatePanel}
                      goal={goal}
                      setGoal={setGoal}
                      pose={pose}
                      setPose={setPose}
                      framing={framing}
                      setFraming={setFraming}
                      expression={expression}
                      setExpression={setExpression}
                      colorStyle={colorStyle}
                      setColorStyle={setColorStyle}
                      camera={camera}
                      setCamera={setCamera}
                      lens={lens}
                      setLens={setLens}
                      light={light}
                      setLight={setLight}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-crimson/30 bg-crimson/5 p-6">
              <p className="mb-2 text-base font-bold text-crimson">⛔ Richiesta bloccata</p>
              <p className="text-sm font-semibold leading-relaxed text-foreground">
                Nessuna persona reale ha acconsentito a questa richiesta, e questo è il punto.
              </p>
              {result.reason && <p className="mt-2 text-sm leading-relaxed text-muted">{result.reason}</p>}

              {/* Review D3 — il momento di verità diventa domanda: avvisami / candidati */}
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={saveAlert}
                  disabled={alertState === "saving" || alertState === "saved"}
                  className="rounded-xl border border-violet/35 bg-violet/10 px-4 py-3 text-sm font-bold text-violet-light transition-colors hover:bg-violet/20 disabled:opacity-60"
                >
                  {alertState === "saved" ? "✓ Avviso salvato" : alertState === "saving" ? "Salvo…" : "🔔 Avvisami quando entra un volto compatibile"}
                </button>
                <Link
                  href="/signup"
                  className="rounded-xl border border-teal/35 bg-teal/10 px-4 py-3 text-center text-sm font-bold text-teal transition-colors hover:bg-teal/20"
                >
                  Sei tu questo volto? Candidati →
                </Link>
              </div>
              {alertState === "saved" && (
                <p className="mt-2 text-xs leading-relaxed text-faint">
                  Richiesta registrata come domanda reale: quando entra una persona compatibile, ti avvisiamo.
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {ageGate && (
        <AgeGateModal
          onClose={() => setAgeGate(false)}
          onConfirmed={() => setAgeGate(false)}
        />
      )}
    </main>
  );
}

function ChipGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  // Gruppo di toggle con etichetta programmatica: lo screen reader annuncia il
  // contesto ("Genere", "Capelli"...) entrando nel gruppo di chip.
  const gid = useId();
  return (
    <div>
      <div className="mb-2.5 flex items-baseline gap-2">
        <span id={gid} className="text-sm font-semibold text-muted">{label}</span>
        {hint && <span className="text-[0.7rem] text-faint">· {hint}</span>}
      </div>
      <div role="group" aria-labelledby={gid} className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`focus-ring rounded-full px-3.5 py-2 text-sm font-semibold transition-all ${
        active ? "border border-violet bg-violet/20 text-foreground" : "border border-border bg-obsidian-2 text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
