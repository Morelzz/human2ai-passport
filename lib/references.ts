import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

// ──────────────────────────────────────────────────────────────────────────
// REFERENCE-SET — le foto reali e consensuali di un avatar, usate per
// l'identity-lock dai motori (ECHO/TWIN). SERVER-ONLY.
//
// Per ora legge da una cartella LOCALE mappata via env (es. REFERENCES_MARIO_R),
// così le foto reali NON entrano mai in git. In produzione le reference
// verranno da Supabase Storage cifrato (vedi docs/MULTI_ENGINE.md).
// ──────────────────────────────────────────────────────────────────────────

const MAX_REFS = 8;   // gpt-image-2 ne accetta fino a 10; 8 = compromesso costo/identità
const MAX_DIM = 1024; // lato lungo: riduce i ~17MB DSLR a poche centinaia di KB

function envKeyFor(handle: string): string {
  // mario-r -> REFERENCES_MARIO_R
  return "REFERENCES_" + handle.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

/** Vero se per questo handle è configurata una sorgente di reference (env presente). */
export function hasReferenceSet(handle: string): boolean {
  return !!process.env[envKeyFor(handle)];
}

/** Ritorna il reference-set (immagini reali, ridimensionate) pronte per i motori. */
export async function getReferenceSet(handle: string): Promise<Buffer[]> {
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
      const raw = await readFile(join(dir, f));
      const resized = await sharp(raw)
        .rotate() // rispetta l'orientamento EXIF
        .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
      out.push(resized);
    } catch {
      // file illeggibile: salta, non bloccare l'intero set
    }
  }
  return out;
}
