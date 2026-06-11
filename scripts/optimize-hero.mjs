// ──────────────────────────────────────────────────────────────────────────
// OTTIMIZZAZIONE VIDEO HERO (ondata mobile).
// Scarica assets/hero.mp4 dallo storage, produce con ffmpeg (ffmpeg-static):
//   hero-1080.mp4  desktop  (CRF 28, no audio, faststart)
//   hero-720.mp4   mobile   (CRF 32, no audio, faststart)
//   hero-poster.jpg primo frame (LCP istantaneo mentre il video arriva)
// e li carica sul bucket pubblico "assets". L'originale resta com'è (archivio).
//
// Uso: node --env-file=.env.local scripts/optimize-hero.mjs
// ──────────────────────────────────────────────────────────────────────────
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpeg from "ffmpeg-static";

const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
if (!U || !K) { console.error("Mancano le env Supabase"); process.exit(1); }

const dir = mkdtempSync(join(tmpdir(), "hero-"));
const src = join(dir, "hero.mp4");

console.log("Scarico hero.mp4 …");
const r = await fetch(`${U}/storage/v1/object/public/assets/hero.mp4`);
if (!r.ok) { console.error("download fallito:", r.status); process.exit(1); }
writeFileSync(src, Buffer.from(await r.arrayBuffer()));
console.log("  originale:", (statSync(src).size / 1e6).toFixed(2), "MB");

function run(args) { execFileSync(ffmpeg, args, { stdio: ["ignore", "ignore", "inherit"] }); }

const out1080 = join(dir, "hero-1080.mp4");
const out720 = join(dir, "hero-720.mp4");
const poster = join(dir, "hero-poster.jpg");

console.log("Transcodifica 1080p (desktop) …");
run(["-y", "-i", src, "-vf", "scale=-2:'min(1080,ih)'", "-c:v", "libx264", "-crf", "28", "-preset", "medium", "-an", "-movflags", "+faststart", out1080]);
console.log("Transcodifica 720p (mobile) …");
run(["-y", "-i", src, "-vf", "scale=-2:'min(720,ih)'", "-c:v", "libx264", "-crf", "32", "-preset", "medium", "-an", "-movflags", "+faststart", out720]);
console.log("Poster (primo frame) …");
run(["-y", "-i", src, "-frames:v", "1", "-vf", "scale=-2:'min(1080,ih)'", "-q:v", "3", poster]);

for (const [path, name, type] of [
  [out1080, "hero-1080.mp4", "video/mp4"],
  [out720, "hero-720.mp4", "video/mp4"],
  [poster, "hero-poster.jpg", "image/jpeg"],
]) {
  const buf = readFileSync(path);
  const up = await fetch(`${U}/storage/v1/object/assets/${name}`, {
    method: "POST",
    headers: { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": type, "x-upsert": "true" },
    body: buf,
  });
  console.log(`  ${name}: ${(buf.length / 1e6).toFixed(2)} MB → upload ${up.status}`);
}
console.log("Fatto.");
