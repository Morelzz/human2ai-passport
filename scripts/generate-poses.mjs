// Genera la LIBRERIA POSE (manichini) per ECHO con gpt-image-2 text-to-image.
// Il manichino è un soggetto sintetico NEUTRO (nessuna identità, nessun volto):
// definisce solo la posa. Stesso soggetto in tutte le immagini = libreria coerente.
//
// USO:
//   node --env-file=.env.local scripts/generate-poses.mjs                → genera TUTTE in scripts/poses-out/
//   node --env-file=.env.local scripts/generate-poses.mjs --only walking → rigenera una sola posa
//   node --env-file=.env.local scripts/generate-poses.mjs --upload       → carica scripts/poses-out/*.png su assets/poses/
//
// Le pose si APPROVANO prima dell'upload: si genera, Morelz guarda, le scarse
// si rigenerano con --only, poi --upload carica ciò che è rimasto nella cartella.
import { writeFile, readFile, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const OUT_DIR = resolve("scripts", "poses-out");

const POSES = [
  ["standing-front", "standing straight facing the camera, arms relaxed at the sides"],
  ["three-quarter", "standing in a three-quarter turn, weight on one leg, relaxed fashion stance"],
  ["walking", "captured mid-stride walking forward, one leg ahead, natural arm swing"],
  ["arms-crossed", "standing facing the camera with arms crossed over the chest"],
  ["hands-in-pockets", "standing with both hands in trouser pockets, confident relaxed stance"],
  ["sitting-stool", "sitting on a tall stool, one foot on the footrest, upright posture"],
  ["leaning-wall", "leaning sideways against a plain wall with one shoulder, ankles crossed"],
  ["profile", "standing in full side profile, looking straight ahead"],
  ["hand-on-chin", "standing with one arm folded and the other hand raised to the chin, thoughtful pose"],
  ["legs-crossed-standing", "standing with one leg crossed in front of the other, one hand on the hip"],
  ["sitting-floor", "sitting on the floor with one knee up and an arm resting on the knee"],
  ["arms-open", "standing with both arms open wide, expressive fashion pose"],
];

const promptFor = (desc) =>
  `A faceless articulated grey tailor's mannequin (full body, matte grey material, no face, no hair, visible joints) ${desc}. ` +
  `Full body visible from head to toe, centered, plain pure white studio background, soft even lighting, ` +
  `minimal catalog photography style. No text, no props unless the pose requires one (stool, wall).`;

async function generateAll(only) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) { console.error("ERRORE: OPENAI_API_KEY assente. Avvia con --env-file=.env.local"); process.exit(1); }
  await mkdir(OUT_DIR, { recursive: true });
  const list = only ? POSES.filter(([slug]) => slug === only) : POSES;
  if (list.length === 0) { console.error(`Posa sconosciuta: ${only}`); process.exit(1); }
  for (const [slug, desc] of list) {
    process.stdout.write(`→ ${slug} … `);
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-2", prompt: promptFor(desc), size: "1024x1536", quality: "medium", n: 1 }),
    });
    const text = await res.text();
    if (!res.ok) { console.error(`ERRORE ${res.status}\n${text.slice(0, 600)}`); process.exit(1); }
    const json = JSON.parse(text);
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) { console.error("Nessuna immagine nella risposta:", JSON.stringify(json).slice(0, 400)); process.exit(1); }
    const out = resolve(OUT_DIR, `${slug}.png`);
    await writeFile(out, Buffer.from(b64, "base64"));
    console.log(`OK → ${out}`);
  }
  console.log(`\nFatto. Guarda le immagini in ${OUT_DIR}: elimina/rigenera (--only <slug>) le scarse, poi --upload.`);
}

async function uploadAll() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Mancano NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }
  const sb = createClient(url, key);
  const { data: bucket } = await sb.storage.getBucket("assets");
  if (!bucket) await sb.storage.createBucket("assets", { public: true });
  const files = (await readdir(OUT_DIR)).filter((f) => f.endsWith(".png"));
  if (files.length === 0) { console.error(`Nessun PNG in ${OUT_DIR}: genera prima.`); process.exit(1); }
  for (const f of files) {
    const buf = await readFile(resolve(OUT_DIR, f));
    const { error } = await sb.storage.from("assets").upload(`poses/${f}`, buf, { contentType: "image/png", upsert: true, cacheControl: "3600" });
    if (error) { console.error(`Errore upload ${f}:`, error.message); process.exit(1); }
    console.log(`OK poses/${f} (${Math.round(buf.length / 1024)} KB)`);
  }
  console.log(`\nLibreria aggiornata: ${files.length} pose su assets/poses/.`);
}

const args = process.argv.slice(2);
if (args.includes("--upload")) {
  await uploadAll();
} else {
  const onlyIdx = args.indexOf("--only");
  await generateAll(onlyIdx >= 0 ? args[onlyIdx + 1] : undefined);
}
