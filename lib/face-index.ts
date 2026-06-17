import { createServerClient } from "@/lib/supabase";
import { uploadPrivate } from "./storage";

// ──────────────────────────────────────────────────────────────────────────
// INDICE VOLTI DEL REGISTRO — SERVER-ONLY.
//
// Per il fallback di /verify: se un'immagine NON ha la filigrana invisibile
// (es. generata su piattaforme terze, senza certificazione Semblic),
// confrontiamo il volto con i volti del registro per risalire comunque al
// titolare e permettergli il ricorso (/report).
//
// L'indice è un JSON nel bucket PRIVATO "face-index" (zero migrazioni, stesso
// precedente di face-match.json del KYC): un descrittore FaceNet (128 float)
// per ogni foto sorgente di ogni avatar pubblico. I descrittori si calcolano
// NEL BROWSER dell'operatore (pagina admin /account/face-index) coi modelli
// già in public/models — qui solo confronto euclideo puro, zero dipendenze.
//
// ONESTÀ: il face match è un INDIZIO, mai una prova. La prova resta la
// filigrana/certificato. Sotto soglia non nominiamo nessuno.
// ──────────────────────────────────────────────────────────────────────────

export const FACE_INDEX_BUCKET = "face-index";
const FACE_INDEX_PATH = "index.json";

// Soglia FaceNet "stessa persona" (~0.6). Oltre, NESSUN nome: meglio un
// mancato riconoscimento che accusare l'avatar sbagliato.
export const FACE_MATCH_MAX_DISTANCE = 0.6;

// Lunghezza del descrittore FaceNet (face-api faceRecognitionNet).
export const DESCRIPTOR_LENGTH = 128;

export interface FaceIndexEntry {
  handle: string;
  source: string; // nome file/origine della foto (debug, mai mostrato in pubblico)
  descriptor: number[];
}

export interface FaceIndex {
  built_at: string;
  entries: FaceIndexEntry[];
}

/** Vero se è un descrittore FaceNet plausibile (128 numeri finiti). */
export function isValidDescriptor(d: unknown): d is number[] {
  return (
    Array.isArray(d) &&
    d.length === DESCRIPTOR_LENGTH &&
    d.every((v) => typeof v === "number" && Number.isFinite(v))
  );
}

/** Carica l'indice dal bucket privato. null = mai costruito / non leggibile. */
export async function loadFaceIndex(): Promise<FaceIndex | null> {
  const admin = createServerClient();
  try {
    const { data } = await admin.storage.from(FACE_INDEX_BUCKET).download(FACE_INDEX_PATH);
    if (!data) return null;
    const parsed = JSON.parse(await data.text()) as FaceIndex;
    if (!Array.isArray(parsed?.entries)) return null;
    parsed.entries = parsed.entries.filter(
      (e) => typeof e?.handle === "string" && isValidDescriptor(e?.descriptor)
    );
    return parsed;
  } catch {
    return null;
  }
}

/** Salva l'indice (sovrascrive: l'indice si ricostruisce sempre per intero). */
export async function saveFaceIndex(index: FaceIndex): Promise<void> {
  await uploadPrivate(
    FACE_INDEX_BUCKET,
    FACE_INDEX_PATH,
    Buffer.from(JSON.stringify(index)),
    "application/json"
  );
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export interface FaceIndexMatch {
  handle: string;
  distance: number; // miglior accoppiamento (minima) tra le foto dell'avatar
  avatarsChecked: number;
}

/**
 * Miglior corrispondenza nell'indice (distanza MINIMA per avatar, poi il
 * migliore tra gli avatar). La soglia la applica chi chiama: qui solo i numeri.
 */
export function findFaceMatch(descriptor: number[], index: FaceIndex): FaceIndexMatch | null {
  const ranked = rankFaceMatches(descriptor, index);
  if (ranked.length === 0) return null;
  return { ...ranked[0], avatarsChecked: ranked.length };
}

/**
 * TUTTE le corrispondenze per avatar (distanza minima per handle), ordinate
 * dalla più vicina. `allowedHandles` (filtri "restringi il cerchio") limita il
 * confronto ai soli avatar compatibili coi metadati — il cerchio si stringe
 * PRIMA del confronto biometrico, mai abbassando la soglia.
 */
export function rankFaceMatches(
  descriptor: number[],
  index: FaceIndex,
  allowedHandles?: Set<string>
): Array<{ handle: string; distance: number }> {
  const bestPerHandle = new Map<string, number>();
  for (const entry of index.entries) {
    if (allowedHandles && !allowedHandles.has(entry.handle)) continue;
    const d = euclidean(descriptor, entry.descriptor);
    const prev = bestPerHandle.get(entry.handle);
    if (prev === undefined || d < prev) bestPerHandle.set(entry.handle, d);
  }
  return [...bestPerHandle.entries()]
    .map(([handle, distance]) => ({ handle, distance }))
    .sort((a, b) => a.distance - b.distance);
}
