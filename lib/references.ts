import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { downloadAll, uploadPrivate } from "./storage";

// ──────────────────────────────────────────────────────────────────────────
// REFERENCE-SET — le foto reali e consensuali di un avatar, usate per
// l'identity-lock dai motori (ECHO/TWIN). SERVER-ONLY.
//
// Fonte di verità: Supabase Storage (bucket PRIVATO "references", funziona anche
// in produzione). In dev si può popolare lo storage dalla cartella locale mappata
// via env (REFERENCES_<HANDLE>) — le foto reali NON entrano mai in git.
// ──────────────────────────────────────────────────────────────────────────

const REFERENCES_BUCKET = "references";
const MAX_REFS = 8; // gpt-image-2 ne accetta fino a 10; 8 = compromesso costo/identità
const MAX_DIM = 1024; // lato lungo: riduce i ~17MB DSLR a poche centinaia di KB

function envKeyFor(handle: string): string {
  return "REFERENCES_" + handle.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

// Ridimensiona una foto sorgente per l'invio ai motori (più leggera, EXIF-aware).
async function shrink(raw: Buffer): Promise<Buffer> {
  return sharp(raw)
    .rotate()
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** Vero se c'è una sorgente di reference (storage o cartella locale) per l'handle. */
export async function hasReferenceSet(handle: string): Promise<boolean> {
  return (await getReferenceSet(handle)).length > 0;
}

/** Reference-set pronto per i motori. Prima Supabase, poi fallback cartella locale. */
export async function getReferenceSet(handle: string): Promise<Buffer[]> {
  // 1) Supabase Storage (prod + qualunque ambiente).
  try {
    const cloud = await downloadAll(REFERENCES_BUCKET, handle);
    if (cloud.length > 0) return cloud.slice(0, MAX_REFS);
  } catch {
    // storage non disponibile: prova il fallback locale
  }

  // 2) Fallback locale (dev): cartella mappata via env, resize al volo.
  const dir = process.env[envKeyFor(handle)];
  if (!dir) return [];
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  } catch {
    return [];
  }
  const out: Buffer[] = [];
  for (const f of files.slice(0, MAX_REFS)) {
    try {
      out.push(await shrink(await readFile(join(dir, f))));
    } catch {
      /* salta file illeggibile */
    }
  }
  return out;
}

/**
 * Migrazione: legge le foto dalla cartella locale (env REFERENCES_<HANDLE>),
 * le ridimensiona e le carica su Supabase Storage (bucket privato). Idempotente.
 * Ritorna quante reference sono state caricate.
 */
export async function uploadReferenceSetFromLocal(handle: string): Promise<number> {
  const dir = process.env[envKeyFor(handle)];
  if (!dir) throw new Error(`Nessuna cartella locale per '${handle}' (env ${envKeyFor(handle)} non impostata).`);
  const files = (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().slice(0, MAX_REFS);
  let n = 0;
  for (let i = 0; i < files.length; i++) {
    const resized = await shrink(await readFile(join(dir, files[i])));
    const idx = String(i).padStart(2, "0");
    await uploadPrivate(REFERENCES_BUCKET, `${handle}/ref-${idx}.jpg`, resized, "image/jpeg");
    n++;
  }
  return n;
}
