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

async function ensureModels(): Promise<FaceApi> {
  if (!api) api = await import("@vladmandic/face-api");
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
