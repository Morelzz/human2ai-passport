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
  selfie_photo: { distance: number; similarity: number } | null;
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

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("img"));
      img.src = url;
    });
    return img;
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

// Distanza -> percentuale leggibile. Curva logistica centrata sulla soglia
// FaceNet "stessa persona" (~0.6): 0.4 -> ~88%, 0.55 -> ~62%, 0.6 -> 50%,
// 0.7 -> ~27%. NB tra pose diverse (frontale vs profilo) la distanza sale
// anche per la stessa persona: per questo il badge resta un AIUTO, non un verdetto.
export function similarityFromDistance(distance: number): number {
  return Math.round(100 / (1 + Math.exp((distance - 0.6) / 0.1)));
}

function pair(f: FaceApi, a: Float32Array | null, b: Float32Array | null) {
  if (!a || !b) return null;
  const distance = f.euclideanDistance(a, b);
  return { distance: Math.round(distance * 1000) / 1000, similarity: similarityFromDistance(distance) };
}

/** Confronta documento ↔ selfie ↔ prima foto. Non lancia mai: null = non calcolabile. */
export async function computeFaceMatch(
  document: File,
  selfie: File,
  firstPhoto: File | undefined,
): Promise<FaceMatchResult | null> {
  try {
    const f = await ensureModels();
    const [dDoc, dSelfie, dPhoto] = await Promise.all([
      descriptorFor(f, document),
      descriptorFor(f, selfie),
      firstPhoto ? descriptorFor(f, firstPhoto) : Promise.resolve(null),
    ]);
    return {
      engine: "face-api-client",
      doc_selfie: pair(f, dDoc, dSelfie),
      selfie_photo: pair(f, dSelfie, dPhoto),
      faces_found: { document: !!dDoc, selfie: !!dSelfie, photo: !!dPhoto },
      computed_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
