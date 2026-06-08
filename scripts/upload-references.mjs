// Carica il reference-set di un avatar dalla cartella locale (env
// REFERENCES_<HANDLE>) a Supabase Storage (bucket privato "references/{handle}").
// Serve a far funzionare ECHO in PRODUZIONE per avatar le cui foto sono finora
// solo sul PC (es. Mario). Idempotente (upsert).
//
// USO:  node --env-file=.env.local scripts/upload-references.mjs mario-r
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const HANDLE = (process.argv[2] || "").trim().toLowerCase();
if (!HANDLE) { console.error("Uso: node --env-file=.env.local scripts/upload-references.mjs <handle>"); process.exit(1); }

const ENV = "REFERENCES_" + HANDLE.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
const dir = process.env[ENV];
if (!dir) { console.error(`Manca la env ${ENV} (cartella locale delle foto).`); process.exit(1); }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Mancano NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }

const sb = createClient(url, key);
const { data: bucket } = await sb.storage.getBucket("references");
if (!bucket) await sb.storage.createBucket("references", { public: false });

const files = (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().slice(0, 8);
if (files.length === 0) { console.error(`Nessuna foto in ${dir}`); process.exit(1); }

let n = 0;
for (let i = 0; i < files.length; i++) {
  const resized = await sharp(await readFile(join(dir, files[i])))
    .rotate()
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  const path = `${HANDLE}/ref-${String(i).padStart(2, "0")}.jpg`;
  const { error } = await sb.storage.from("references").upload(path, resized, { contentType: "image/jpeg", upsert: true });
  if (error) { console.error(`Errore su ${path}:`, error.message); process.exit(1); }
  n++;
  console.log(`✓ ${path}  (${Math.round(resized.length / 1024)} KB)`);
}
console.log(`FATTO: ${n} reference caricate su Supabase per '${HANDLE}'. ECHO ora funziona in produzione per questo avatar.`);
