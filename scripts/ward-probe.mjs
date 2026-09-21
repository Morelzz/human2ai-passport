// Sonda di discovery Ward su un avatar REALE (le sue 8 foto reference vere nel
// bucket privato `references/<handle>`), col vero motore Google Vision
// (WEB_DETECTION), come fa lib/ward/discovery/google-vision.ts.
// USO LOCALE / NON COMMITTARE (legge .env.local). Solo lettura su storage,
// nessuna scrittura su DB, nessun consenso toccato.
//   node scripts/ward-probe.mjs <handle>
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ROOT = "F:/human2ai-passport";
const handle = process.argv[2] || "luca-agnelli";

// .env.local -> oggetto (niente stampa dei valori)
const env = {};
for (const line of readFileSync(`${ROOT}/.env.local`, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const pick = (...names) => names.map((n) => env[n]).find(Boolean);
const findBy = (sub) => { const k = Object.keys(env).find((x) => x.includes(sub)); return k ? env[k] : undefined; };

const SUPA_URL = pick("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL") || findBy("SUPABASE_URL");
const SERVICE = pick("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY") || findBy("SERVICE_ROLE");
const VKEY = pick("GOOGLE_VISION_API_KEY") || findBy("VISION");

console.log(`env: url=${SUPA_URL ? "ok" : "MANCA"} service=${SERVICE ? "ok" : "MANCA"} vision=${VKEY ? "ok" : "MANCA"}`);
if (!SUPA_URL || !SERVICE || !VKEY) { console.error("Chiavi mancanti in .env.local"); process.exit(1); }

const supa = createClient(SUPA_URL, SERVICE);

const { data: files, error: lerr } = await supa.storage.from("references").list(handle);
if (lerr) { console.error("list error:", lerr.message); process.exit(1); }
const refs = (files || []).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f.name));
console.log(`\nAvatar: ${handle} — ${refs.length} foto reference nel bucket\n`);

async function vision(b64) {
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${VKEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ image: { content: b64 }, features: [{ type: "WEB_DETECTION", maxResults: 20 }] }] }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Vision ${res.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.responses?.[0]?.webDetection || {};
}

const pages = new Set(), fullImgs = new Set(), partialImgs = new Set(), similar = new Set();
const entities = new Map();
let calls = 0;

for (const f of refs) {
  const { data: blob, error: derr } = await supa.storage.from("references").download(`${handle}/${f.name}`);
  if (derr) { console.log(`  ${f.name}: download error ${derr.message}`); continue; }
  const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
  try {
    const wd = await vision(b64);
    calls++;
    (wd.pagesWithMatchingImages || []).forEach((p) => p.url && pages.add(p.url));
    (wd.fullMatchingImages || []).forEach((i) => i.url && fullImgs.add(i.url));
    (wd.partialMatchingImages || []).forEach((i) => i.url && partialImgs.add(i.url));
    (wd.visuallySimilarImages || []).forEach((i) => i.url && similar.add(i.url));
    (wd.webEntities || []).forEach((e) => { if (e.description) entities.set(e.description, Math.max(entities.get(e.description) || 0, e.score || 0)); });
    console.log(`  ${f.name}: full=${(wd.fullMatchingImages||[]).length} partial=${(wd.partialMatchingImages||[]).length} pages=${(wd.pagesWithMatchingImages||[]).length} simili=${(wd.visuallySimilarImages||[]).length}`);
  } catch (e) {
    console.log(`  ${f.name}: ${e.message}`);
  }
}

const topEnt = [...entities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(`\n=== AGGREGATO (${calls} chiamate Vision) ===`);
console.log(`Pagine con match:        ${pages.size}`);
console.log(`Immagini match esatto:   ${fullImgs.size}`);
console.log(`Immagini match parziale: ${partialImgs.size}`);
console.log(`Immagini simili (sosia): ${similar.size}`);
console.log(`\nEntita' riconosciute da Vision (chi pensa che sia):`);
topEnt.forEach(([d, s]) => console.log(`  - ${d}  (${s.toFixed(2)})`));
console.log(`\nPrime pagine trovate:`);
[...pages].slice(0, 10).forEach((u) => console.log(`  ${u}`));
console.log(`\nCosto stimato: ${calls} x $0,0035 = $${(calls * 0.0035).toFixed(3)} (free tier: prime 1.000/mese)`);
