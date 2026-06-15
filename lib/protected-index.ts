import { createServerClient } from "@/lib/supabase";
import { uploadPrivate } from "./storage";
import { FACE_INDEX_BUCKET, type FaceIndex, type FaceIndexEntry, isValidDescriptor } from "./face-index";

// ──────────────────────────────────────────────────────────────────────────
// INDICE dei volti in SOLA PROTEZIONE (modulo VETO, Fase 2) — SERVER-ONLY.
//
// Tenuto SEPARATO dall'indice pubblico (index.json), che l'admin ricostruisce e
// SOVRASCRIVE da getPublicAvatars: qui le voci si AGGIUNGONO alla registrazione
// /veto e non vengono mai travolte da un rebuild. Isola anche i dati biometrici
// dei protetti (GDPR Art.9) dal registro vendibile. Stesso formato FaceNet
// (128 float), stesso bucket privato face-index, file protected-index.json.
//
// Consumatori: /api/verify-face (2.5: mai rivelare chi e') e lo scan output (2.3).
// ──────────────────────────────────────────────────────────────────────────

const PROTECTED_INDEX_PATH = "protected-index.json";

export async function loadProtectedIndex(): Promise<FaceIndex | null> {
  const admin = createServerClient();
  try {
    const { data } = await admin.storage.from(FACE_INDEX_BUCKET).download(PROTECTED_INDEX_PATH);
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

async function saveProtectedIndex(index: FaceIndex): Promise<void> {
  await uploadPrivate(FACE_INDEX_BUCKET, PROTECTED_INDEX_PATH, Buffer.from(JSON.stringify(index)), "application/json");
}

// Aggiunge i descrittori di un volto protetto (APPEND, mai sovrascrive l'intero
// indice). Sostituisce eventuali voci dello stesso handle (re-registrazione pulita).
export async function appendProtectedFaces(handle: string, descriptors: number[][], source = "veto"): Promise<number> {
  const valid = descriptors.filter(isValidDescriptor);
  if (valid.length === 0) return 0;
  const index = (await loadProtectedIndex()) ?? { built_at: new Date().toISOString(), entries: [] };
  const kept = index.entries.filter((e) => e.handle !== handle);
  const added: FaceIndexEntry[] = valid.map((d, i) => ({ handle, source: `${source}-${i + 1}`, descriptor: d }));
  await saveProtectedIndex({ built_at: new Date().toISOString(), entries: [...kept, ...added] });
  return added.length;
}

// Rimuove tutte le voci di un handle (diritto all'oblio totale, Fase 2.6).
export async function removeProtectedFaces(handle: string): Promise<number> {
  const index = await loadProtectedIndex();
  if (!index) return 0;
  const kept = index.entries.filter((e) => e.handle !== handle);
  const removed = index.entries.length - kept.length;
  if (removed > 0) await saveProtectedIndex({ built_at: new Date().toISOString(), entries: kept });
  return removed;
}
