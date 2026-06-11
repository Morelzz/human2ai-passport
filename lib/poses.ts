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

// Descrizione INGLESE della posa per il prompt del motore. Il manichino è solo
// il menu visivo del compratore: al motore arriva TESTO (lezione E2E: l'endpoint
// edits mette in scena qualsiasi immagine di reference, anche col divieto nel
// prompt — il manichino compariva accanto alla persona).
const POSE_PROMPTS: Record<string, string> = {
  "standing-front": "standing straight facing the camera, arms relaxed at the sides",
  "three-quarter": "standing in a three-quarter turn, weight on one leg, relaxed fashion stance",
  walking: "captured mid-stride walking forward, one leg ahead, natural arm swing",
  "arms-crossed": "standing facing the camera with arms crossed over the chest",
  "hands-in-pockets": "standing with both hands in trouser pockets, confident relaxed stance",
  "sitting-stool": "sitting on a tall stool, one foot on the footrest, upright posture",
  "leaning-wall": "leaning sideways against a plain wall with one shoulder, ankles crossed",
  profile: "standing in full side profile, looking straight ahead",
  "hand-on-chin": "standing with one arm folded and the other hand raised to the chin, thoughtful pose",
  "legs-crossed-standing": "standing with one leg crossed in front of the other, one hand on the hip",
  "sitting-floor": "sitting on the floor with one knee up and an arm resting on the knee",
  "arms-open": "standing with both arms open wide, expressive fashion pose",
};

// Risolve l'id in una descrizione di posa per il prompt. La posa DEVE esistere
// nella libreria su storage (poseId è input del client: la whitelist è il
// bucket, che carichiamo solo noi — mai testo arbitrario nel prompt).
// Posa inesistente → null (il chiamante risponde 400).
export async function fetchPosePrompt(id: string): Promise<string | null> {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) return null;
  const poses = await listPoses();
  if (!poses.some((p) => p.id === id)) return null;
  // Fallback per pose nuove senza voce in mappa: lo slug umanizzato è già una
  // descrizione leggibile ("arms-crossed" → "arms crossed"), e viene dal NOSTRO
  // nome file, non dal client.
  return POSE_PROMPTS[id] ?? id.replace(/-/g, " ");
}
