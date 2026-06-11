"use client";

// FACE MATCH client-side per il KYC (gradino 2 della verifica identità).
// Gira NEL BROWSER della persona (face-api / FaceNet, modelli in /models):
// zero servizi esterni, zero costi, i volti non lasciano il dispositivo
// prima dell'invio. Il risultato è un PRE-SCREENING per la coda operatori:
// essendo calcolato sul client è un aiuto alla decisione, MAI una prova —
// la decisione resta dell'operatore che guarda le immagini.
// Quando servirà il livello certificato (Stripe Identity / Rekognition),
// si innesta sopra lo stesso campo kyc_status senza buttare nulla.

export interface FaceMatchResult {
  engine: "face-api-client";
  // distanza euclidea tra descrittori FaceNet: <=0.5 stessa persona quasi
  // certa, 0.5-0.6 probabile, >0.6 dubbia. similarity = stima leggibile 0-100.
  doc_selfie: { distance: number; similarity: number } | null;
  // selfie vs TUTTE le foto del set: si riporta il MIGLIOR accoppiamento
  // (la posa frontale; i profili/spalle alzano la distanza per natura).
  selfie_photo: { distance: number; similarity: number; checked?: number } | null;
  faces_found: { document: boolean; selfie: boolean; photo: boolean };
  computed_at: string;
}

type FaceApi = typeof import("@vladmandic/face-api");

let api: FaceApi | null = null;
let modelsReady = false;
let backendReady = false;

// TFJS NON sceglie sempre un backend funzionante da solo: su alcuni browser
// seleziona 'wasm' senza averlo inizializzato (binari assenti) e OGNI analisi
// muore con "backend 'wasm' has not yet been initialized" (visto dal vivo).
// Inizializziamo esplicitamente: webgl → fallback cpu (lento ma funziona ovunque).
async function ensureBackend(f: FaceApi): Promise<void> {
  if (backendReady) return;
  const tf = (f as unknown as {
    tf?: { setBackend(n: string): Promise<boolean>; ready(): Promise<void>; getBackend(): string | undefined };
  }).tf;
  if (!tf) { backendReady = true; return; }
  for (const backend of ["webgl", "cpu"]) {
    try {
      if (await tf.setBackend(backend)) {
        await tf.ready();
        backendReady = true;
        return;
      }
    } catch {
      /* prova il prossimo */
    }
  }
  // Ultimo tentativo: qualunque backend sia attivo, almeno attenderne l'init.
  try { await tf.ready(); } catch { /* l'errore emergerà con diagnostica in analisi */ }
  backendReady = true;
}

async function ensureModels(): Promise<FaceApi> {
  if (!api) api = await import("@vladmandic/face-api");
  await ensureBackend(api);
  if (!modelsReady) {
    await Promise.all([
      api.nets.ssdMobilenetv1.loadFromUri("/models"),
      api.nets.faceLandmark68Net.loadFromUri("/models"),
      api.nets.faceRecognitionNet.loadFromUri("/models"),
    ]);
    modelsReady = true;
  }
  return api;
}

async function loadImage(url: string, crossOrigin = false): Promise<HTMLImageElement> {
  const img = new Image();
  if (crossOrigin) img.crossOrigin = "anonymous"; // serve per leggere i pixel da Supabase Storage
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("img"));
    img.src = url;
  });
  return img;
}

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    // l'URL serve finché l'immagine è in memoria: revoca posticipata
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

// Descrittore del volto PIÙ GRANDE nell'immagine (sui documenti ci sono
// volti piccoli: minConfidence basso per non perderli).
async function descriptorFor(f: FaceApi, file: File): Promise<Float32Array | null> {
  try {
    const img = await fileToImage(file);
    const det = await f
      .detectAllFaces(img, new f.SsdMobilenetv1Options({ minConfidence: 0.3 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
    if (!det.length) return null;
    const biggest = det.sort((a, b) => b.detection.box.area - a.detection.box.area)[0];
    return biggest.descriptor;
  } catch {
    return null;
  }
}

// ── Descrittori riusabili fuori dal KYC (indice volti del registro) ────────
// Stesso motore del face-match KYC: volto PIÙ GRANDE dell'immagine → 128 float.
// Tutto sul dispositivo: i pixel non lasciano il browser, viaggia solo il vettore.

/** Descrittore FaceNet da un File locale (null = nessun volto / non calcolabile). */
export async function descriptorForFile(file: File): Promise<number[] | null> {
  try {
    const f = await ensureModels();
    const d = await descriptorFor(f, file);
    return d ? Array.from(d) : null;
  } catch {
    return null;
  }
}

// ── Quality gate per /verify ────────────────────────────────────────────────
// Nominare l'avatar sbagliato su un volto sgranato è il peccato capitale del
// registro: prima del confronto biometrico misuriamo qualità e dimensione del
// volto. Se il volto è PICCOLO ma nitido facciamo un upscale CONSERVATIVO
// (interpolazione canvas: nessun dettaglio inventato — lo standard H2AI-SCAN
// vieta gli upscaler generativi proprio perché inventano il volto) e
// riproviamo. Se la qualità resta insufficiente: nessun confronto, onestà.

export interface VerifyFaceAnalysis {
  descriptor: number[] | null;
  // ok = confronto affidabile; upscaled = ok dopo upscale conservativo;
  // low = qualità insufficiente (NESSUN confronto); no_face = nessun volto;
  // error = l'analisi è FALLITA (eccezione: GPU/memoria/modelli) — da
  // distinguere SEMPRE da no_face: "non c'è un volto" ≠ "non sono riuscito".
  quality: "ok" | "upscaled" | "low" | "no_face" | "error";
  faceBox: number | null; // lato minore del box volto (px, post-upscale se usato)
  blurVar: number | null; // varianza del Laplaciano (proxy di nitidezza)
  detail?: string; // diagnostica leggibile (dimensioni, messaggio errore)
}

const MIN_FACE_BOX = 72;   // sotto: si tenta l'upscale conservativo
const MIN_FACE_BOX_HARD = 48; // sotto anche dopo upscale: confronto rifiutato
const MIN_BLUR_VAR = 18;   // sotto: immagine troppo sfocata per pronunciarsi

// Varianza del Laplaciano su una miniatura in scala di grigi (metrica classica
// di nitidezza, economica: ~256px di lato).
function laplacianVariance(img: HTMLImageElement | HTMLCanvasElement): number | null {
  try {
    const side = 256;
    const w = "naturalWidth" in img ? img.naturalWidth : img.width;
    const h = "naturalHeight" in img ? img.naturalHeight : img.height;
    const scale = Math.min(1, side / Math.max(w, h));
    const cw = Math.max(8, Math.round(w * scale));
    const ch = Math.max(8, Math.round(h * scale));
    const c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, cw, ch);
    const { data } = ctx.getImageData(0, 0, cw, ch);
    const gray = new Float32Array(cw * ch);
    for (let i = 0; i < cw * ch; i++) {
      gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    }
    let sum = 0, sumSq = 0, n = 0;
    for (let y = 1; y < ch - 1; y++) {
      for (let x = 1; x < cw - 1; x++) {
        const i = y * cw + x;
        const lap = gray[i - 1] + gray[i + 1] + gray[i - cw] + gray[i + cw] - 4 * gray[i];
        sum += lap; sumSq += lap * lap; n++;
      }
    }
    if (n === 0) return null;
    const mean = sum / n;
    return sumSq / n - mean * mean;
  } catch {
    return null;
  }
}

type DetectInput = HTMLImageElement | HTMLCanvasElement;

function inputSize(i: DetectInput): { w: number; h: number } {
  return "naturalWidth" in i ? { w: i.naturalWidth, h: i.naturalHeight } : { w: i.width, h: i.height };
}

// Ri-scala via canvas (interpolazione, nessuna AI): usata sia per RIDURRE le
// foto giganti sia per l'upscale conservativo dei volti piccoli.
function scaleCanvas(img: DetectInput, scale: number): HTMLCanvasElement {
  const { w, h } = inputSize(img);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

// Le foto da studio/DSLR arrivano a 5000-8000px: oltre i limiti texture di
// molte GPU (il detector muore in silenzio) e comunque inutili per FaceNet.
// Normalizziamo a ≤2000px PRIMA di tutto: più robusto su ogni browser, più
// veloce, e passa dal canvas (che assorbe anche l'orientamento EXIF).
const MAX_DETECT_SIDE = 2000;

function normalizeInput(img: HTMLImageElement): DetectInput {
  const { w, h } = inputSize(img);
  const maxSide = Math.max(w, h);
  if (maxSide <= MAX_DETECT_SIDE) return img;
  return scaleCanvas(img, MAX_DETECT_SIDE / maxSide);
}

async function detectBiggest(f: FaceApi, input: HTMLImageElement | HTMLCanvasElement) {
  const det = await f
    .detectAllFaces(input, new f.SsdMobilenetv1Options({ minConfidence: 0.3 }))
    .withFaceLandmarks()
    .withFaceDescriptors();
  if (!det.length) return null;
  return det.sort((a, b) => b.detection.box.area - a.detection.box.area)[0];
}

/** Analisi del volto per /verify: descrittore + verdetto di qualità.
 *  Non lancia mai: in caso di errore quality="no_face". Tutto sul dispositivo. */
export async function analyzeFaceForVerify(file: File): Promise<VerifyFaceAnalysis> {
  try {
    const f = await ensureModels();
    const img = await fileToImage(file);
    // Prima di tutto: dimensioni gestibili dal detector su QUALSIASI GPU.
    const input = normalizeInput(img);
    const blurVar = laplacianVariance(input);

    let det = await detectBiggest(f, input);
    let upscaled = false;
    let boxMin = det ? Math.min(det.detection.box.width, det.detection.box.height) : null;

    // Nessun volto su immagine piccola, o volto trovato ma minuscolo:
    // upscale conservativo e seconda chance al detector.
    const { w: inW, h: inH } = inputSize(input);
    const needsUpscale =
      (!det && Math.min(inW, inH) < 600) ||
      (det && boxMin !== null && boxMin < MIN_FACE_BOX);
    if (needsUpscale) {
      const target = boxMin ? Math.min(3, Math.max(2, (MIN_FACE_BOX * 2) / boxMin)) : 2;
      const canvas = scaleCanvas(input, target);
      const det2 = await detectBiggest(f, canvas);
      if (det2) {
        det = det2;
        boxMin = Math.min(det2.detection.box.width, det2.detection.box.height);
        upscaled = true;
      }
    }

    if (!det) {
      return {
        descriptor: null,
        quality: "no_face",
        faceBox: null,
        blurVar,
        detail: `analizzata a ${inW}×${inH}px${upscaled ? " (+upscale)" : ""}, nitidezza ${blurVar === null ? "n/d" : Math.round(blurVar)}`,
      };
    }

    // Sfocatura estrema o volto ancora troppo piccolo: NESSUN confronto.
    // Meglio nessuna risposta che una percentuale calcolata su pixel che
    // non contengono l'informazione.
    const tooBlurry = blurVar !== null && blurVar < MIN_BLUR_VAR;
    const tooSmall = boxMin !== null && boxMin < MIN_FACE_BOX_HARD;
    if (tooBlurry || tooSmall) {
      return { descriptor: null, quality: "low", faceBox: boxMin, blurVar };
    }

    return {
      descriptor: Array.from(det.descriptor),
      quality: upscaled ? "upscaled" : "ok",
      faceBox: boxMin,
      blurVar,
    };
  } catch (e) {
    return {
      descriptor: null,
      quality: "error",
      faceBox: null,
      blurVar: null,
      detail: e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 160) : "errore sconosciuto",
    };
  }
}

/** Descrittore FaceNet da un URL immagine (richiede CORS; null = non calcolabile). */
export async function descriptorForUrl(url: string): Promise<number[] | null> {
  try {
    const f = await ensureModels();
    const img = await loadImage(url, true);
    const det = await f
      .detectAllFaces(img, new f.SsdMobilenetv1Options({ minConfidence: 0.3 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
    if (!det.length) return null;
    const biggest = det.sort((a, b) => b.detection.box.area - a.detection.box.area)[0];
    return Array.from(biggest.descriptor);
  } catch {
    return null;
  }
}

// Distanza -> percentuale leggibile: la curva vive in lib/face-similarity
// (fonte unica, condivisa col server). NB tra pose diverse (frontale vs
// profilo) la distanza sale anche per la stessa persona: per questo il
// badge resta un AIUTO, non un verdetto.
import { similarityFromDistance } from "./face-similarity";
export { similarityFromDistance };

function pair(f: FaceApi, a: Float32Array | null, b: Float32Array | null) {
  if (!a || !b) return null;
  const distance = f.euclideanDistance(a, b);
  return { distance: Math.round(distance * 1000) / 1000, similarity: similarityFromDistance(distance) };
}

/** Confronta documento (fronte) ↔ selfie ↔ tutte le foto del set.
 *  Non lancia mai: null = non calcolabile. */
export async function computeFaceMatch(
  documentFront: File,
  selfie: File,
  photos: File[],
): Promise<FaceMatchResult | null> {
  try {
    const f = await ensureModels();
    const [dDoc, dSelfie] = await Promise.all([
      descriptorFor(f, documentFront),
      descriptorFor(f, selfie),
    ]);

    // selfie vs ogni foto: tiene il MIGLIOR accoppiamento (distanza minima)
    let best: { distance: number; similarity: number } | null = null;
    let checked = 0;
    let anyPhotoFace = false;
    if (dSelfie) {
      for (const photo of photos) {
        const dPhoto = await descriptorFor(f, photo);
        if (!dPhoto) continue;
        anyPhotoFace = true;
        checked++;
        const p = pair(f, dSelfie, dPhoto);
        if (p && (!best || p.distance < best.distance)) best = p;
      }
    }

    return {
      engine: "face-api-client",
      doc_selfie: pair(f, dDoc, dSelfie),
      selfie_photo: best ? { ...best, checked } : null,
      faces_found: { document: !!dDoc, selfie: !!dSelfie, photo: anyPhotoFace },
      computed_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
