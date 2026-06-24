import { createServerClient } from "@/lib/supabase";
import { getDiditPortraitUrl } from "@/lib/kyc/didit";
import { embed } from "@/lib/ward/matching/embed";
import { bandFromDistance, type MatchBand } from "@/lib/identity-match";
import { similarityFromDistance } from "@/lib/face-similarity";
import { reportDegradation } from "@/lib/observability";

// CRIT-6: il gate anti-impersonazione NON deve cedere in silenzio se i modelli
// face-api/wasm non caricano. Distinguiamo "modelli non disponibili" (errore di
// infrastruttura -> il chiamante BLOCCA, fail-closed) da "nessun volto / nessun
// riferimento" (esito legittimo -> revisione manuale). Questo errore segnala il
// primo caso.
export class IdentityModelsUnavailableError extends Error {
  constructor() {
    super("identity_models_unavailable");
    this.name = "IdentityModelsUnavailableError";
  }
}

// Embedda "fail-closed": se embed lancia (modelli giu) lo segnaliamo e rilanciamo
// un errore tipato; se semplicemente non c'e un volto, descriptor resta null.
async function embedOrThrow(bytes: Uint8Array, stage: string, userId: string): Promise<number[] | null> {
  try {
    const { descriptor } = await embed(bytes);
    return descriptor;
  } catch {
    reportDegradation("identity_gate.models_unavailable", { stage, userId });
    throw new IdentityModelsUnavailableError();
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Lega l'IDENTITA' VERIFICATA (KYC Didit) alle foto che la persona carica
// (avatar / Ward): il volto del documento deve combaciare col volto che entra
// nel registro. Anti-impersonazione. Si conserva SOLO il descrittore 128-d del
// volto verificato (mai la foto del documento). Stesso spazio FaceNet e stesse
// soglie del resto del sistema (lib/identity-match, lib/ward/matching).
// ──────────────────────────────────────────────────────────────────────────

function euclid(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

// Descrittore del volto verificato per l'utente. Cache su
// profiles.identity_face_descriptor; se manca, lo calcola scaricando il
// portrait dalla decisione Didit (via identity_session_id) ed embeddandolo
// server-side, poi lo salva. null se non ricavabile (nessuna sessione, link
// scaduto, nessun volto).
export async function getIdentityDescriptor(userId: string): Promise<number[] | null> {
  const admin = createServerClient();
  const { data } = await admin
    .from("profiles")
    .select("identity_session_id, identity_face_descriptor")
    .eq("id", userId)
    .maybeSingle();

  const cached = data?.identity_face_descriptor as number[] | null | undefined;
  if (Array.isArray(cached) && cached.length === 128) return cached;

  const sessionId = data?.identity_session_id as string | null | undefined;
  if (!sessionId) return null;

  const url = await getDiditPortraitUrl(sessionId);
  if (!url) return null;
  // Scarico del portrait: errori di rete = nessun riferimento (best-effort).
  let bytes: Uint8Array;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
  // Embedding del volto verificato: un fallimento dei MODELLI non va mascherato
  // (CRIT-6), lo rilancia embedOrThrow. "Nessun volto nel portrait" resta null.
  const descriptor = await embedOrThrow(bytes, "reference", userId);
  if (!descriptor || descriptor.length !== 128) return null;
  await admin.from("profiles").update({ identity_face_descriptor: descriptor }).eq("id", userId);
  return descriptor;
}

export interface IdentityFaceCheck {
  band: MatchBand; // strong (<=0.5) | review (<=0.6) | weak (>0.6)
  distance: number;
  similarity: number; // 0-100
}

// Confronta una FOTO caricata (bytes) col volto verificato dell'utente.
// Embedda la foto server-side e misura la distanza. Ritorna null = NON
// confrontabile (nessun riferimento, o nessun volto nella foto): il chiamante
// decide il fallback (di norma: revisione manuale, mai un blocco cieco).
export async function checkFaceAgainstIdentity(
  userId: string,
  imageBytes: Uint8Array,
): Promise<IdentityFaceCheck | null> {
  const ref = await getIdentityDescriptor(userId);
  if (!ref) return null;
  const descriptor = await embedOrThrow(imageBytes, "photo", userId);
  if (!descriptor) return null;
  const distance = euclid(ref, descriptor);
  return { band: bandFromDistance(distance), distance, similarity: similarityFromDistance(distance) };
}

// Come sopra ma su PIU' foto: ritorna il MIGLIOR match (distanza minima) col
// volto verificato. Si ferma appena trova un match forte (<=0.5). Utile per i
// set di foto (avatar 8, Ward 3): basta che il volto registrato sia, nella sua
// foto migliore, la persona verificata. null = nessun riferimento o nessun
// volto leggibile in alcuna foto.
export async function checkBestFaceAgainstIdentity(
  userId: string,
  images: Uint8Array[],
): Promise<IdentityFaceCheck | null> {
  const ref = await getIdentityDescriptor(userId);
  if (!ref) return null;
  let best: IdentityFaceCheck | null = null;
  for (const bytes of images) {
    const descriptor = await embedOrThrow(bytes, "photo", userId);
    if (!descriptor) continue;
    const distance = euclid(ref, descriptor);
    if (!best || distance < best.distance) {
      best = { band: bandFromDistance(distance), distance, similarity: similarityFromDistance(distance) };
      if (best.band === "strong") break;
    }
  }
  return best;
}

// Variante con descrittori GIA' pronti (es. Ward: 128-float calcolati nel
// browser): confronta col volto verificato senza ri-embeddare. Meno autoritativo
// dei bytes, ma utile quando arrivano solo i descrittori. null = nessun
// riferimento o nessun descrittore valido.
export async function checkDescriptorsAgainstIdentity(
  userId: string,
  descriptors: number[][],
): Promise<IdentityFaceCheck | null> {
  const ref = await getIdentityDescriptor(userId);
  if (!ref) return null;
  let best: IdentityFaceCheck | null = null;
  for (const d of descriptors) {
    if (!Array.isArray(d) || d.length !== 128) continue;
    const distance = euclid(ref, d);
    if (!best || distance < best.distance) {
      best = { band: bandFromDistance(distance), distance, similarity: similarityFromDistance(distance) };
      if (best.band === "strong") break;
    }
  }
  return best;
}
