// Carica un file locale (video/immagine) nel bucket PUBBLICO "assets" di Supabase
// (CDN), così non appesantiamo il repo git. Stampa l'URL pubblico.
//
// USO:  node --env-file=.env.local scripts/upload-asset.mjs "<percorso locale>" hero.mp4
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

const src = process.argv[2];
const dest = process.argv[3] || basename(src || "");
if (!src) { console.error("Uso: scripts/upload-asset.mjs <file> [destNome]"); process.exit(1); }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Mancano NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }

const sb = createClient(url, key);
const { data: bucket } = await sb.storage.getBucket("assets");
if (!bucket) await sb.storage.createBucket("assets", { public: true });

const buf = await readFile(src);
const ext = dest.split(".").pop()?.toLowerCase();
const ct = ext === "mp4" ? "video/mp4" : ext === "webm" ? "video/webm" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : "application/octet-stream";

const { error } = await sb.storage.from("assets").upload(dest, buf, { contentType: ct, upsert: true, cacheControl: "31536000" });
if (error) { console.error("Errore upload:", error.message); process.exit(1); }

console.log(`OK (${Math.round(buf.length / 1024 / 1024 * 10) / 10} MB) → ${url}/storage/v1/object/public/assets/${dest}`);
