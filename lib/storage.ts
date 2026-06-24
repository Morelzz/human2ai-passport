import { createServerClient } from "@/lib/supabase";

// ──────────────────────────────────────────────────────────────────────────
// Helper Storage (Supabase). SERVER-ONLY.
//  - immagini generate ECHO  -> bucket PUBBLICO "generations" (URL pulito = image_url)
//  - reference-set degli avatar -> bucket PRIVATO "references" (foto reali, cifrate)
// I bucket vengono creati al volo se mancano (idempotente).
// ──────────────────────────────────────────────────────────────────────────

async function ensureBucket(name: string, isPublic: boolean): Promise<void> {
  const admin = createServerClient();
  const { data } = await admin.storage.getBucket(name);
  if (data) return;
  if (isPublic) {
    // Creare un bucket PUBBLICO e' una scelta consapevole: lasciane traccia.
    // I dati sensibili (volti sorgente, documenti, selfie) NON vanno mai qui.
    console.warn(`[storage] creo bucket PUBBLICO '${name}' (solo output non sensibili)`);
  }
  const { error } = await admin.storage.createBucket(name, { public: isPublic });
  if (error && !/exist/i.test(error.message)) {
    throw new Error(`Storage: impossibile creare il bucket '${name}': ${error.message}`);
  }
}

/** Carica un'immagine in un bucket PUBBLICO e ritorna l'URL pubblico. */
export async function uploadPublicImage(
  bucket: string,
  path: string,
  buf: Buffer,
  contentType = "image/png"
): Promise<string> {
  const admin = createServerClient();
  await ensureBucket(bucket, true);
  const { error } = await admin.storage.from(bucket).upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload '${bucket}/${path}': ${error.message}`);
  return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Carica un file in un bucket PRIVATO (es. reference-set). */
export async function uploadPrivate(
  bucket: string,
  path: string,
  buf: Buffer,
  contentType: string
): Promise<void> {
  const admin = createServerClient();
  await ensureBucket(bucket, false);
  const { error } = await admin.storage.from(bucket).upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload '${bucket}/${path}': ${error.message}`);
}

/**
 * Cancella TUTTI i file sotto un prefisso (es. references/{handle}). Usato per il
 * diritto all'oblio: alla revoca del consenso le foto reali vengono rimosse
 * ("cancello, non cassaforte"). Ritorna quanti file sono stati eliminati. Non
 * lancia: la cancellazione è best-effort.
 */
export async function deletePrefix(bucket: string, prefix: string): Promise<number> {
  const admin = createServerClient();
  try {
    const { data: list } = await admin.storage.from(bucket).list(prefix);
    if (!list || list.length === 0) return 0;
    const paths = list.filter((f) => f.name).map((f) => `${prefix}/${f.name}`);
    if (paths.length === 0) return 0;
    const { error } = await admin.storage.from(bucket).remove(paths);
    return error ? 0 : paths.length;
  } catch {
    return 0;
  }
}

/** Lista e scarica tutti i file immagine sotto un prefisso (per il reference-set). */
export async function downloadAll(bucket: string, prefix: string): Promise<Buffer[]> {
  const admin = createServerClient();
  const { data: list } = await admin.storage.from(bucket).list(prefix);
  if (!list || list.length === 0) return [];
  const files = list
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const out: Buffer[] = [];
  for (const f of files) {
    const { data } = await admin.storage.from(bucket).download(`${prefix}/${f.name}`);
    if (data) out.push(Buffer.from(await data.arrayBuffer()));
  }
  return out;
}

/** Scarica SOLO la prima immagine sotto un prefisso (senza tirare giu' l'intero
 * set). Serve alla discovery Ward per interrogare Vision con una FOTO REALE
 * dell'avatar (reference) invece del portrait generato. null se nessuna. */
export async function downloadFirstImage(bucket: string, prefix: string): Promise<Buffer | null> {
  const admin = createServerClient();
  const { data: list } = await admin.storage.from(bucket).list(prefix);
  const file = (list ?? [])
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name))[0];
  if (!file) return null;
  const { data } = await admin.storage.from(bucket).download(`${prefix}/${file.name}`);
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}
