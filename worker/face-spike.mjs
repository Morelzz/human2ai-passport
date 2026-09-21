// SPIKE (de-risk, NON produzione): face-api in Node, build node-wasm + backend
// WASM (prebuilt, niente compilazione) + sharp. Verifica anche la COMPATIBILITA'
// del descrittore Node con l'indice (browser) del registro.
//   node --env-file=.env.local worker/face-spike.mjs
import * as faceapi from "@vladmandic/face-api/dist/face-api.node-wasm.js";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
setWasmPaths(join(dirname(require.resolve("@tensorflow/tfjs-backend-wasm/package.json")), "dist") + "/");

const tf = faceapi.tf;
const MODELS = "F:/human2ai-passport/public/models";

async function descriptorFromBuffer(buf) {
  const { data, info } = await sharp(buf).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const t = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);
  try {
    const det = await faceapi.detectSingleFace(t).withFaceLandmarks().withFaceDescriptor();
    return det ? Array.from(det.descriptor) : null;
  } finally { t.dispose(); }
}
const euclid = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; } return Math.sqrt(s); };

try {
  await tf.setBackend("wasm");
  await tf.ready();
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS);
  console.log("OK: backend", tf.getBackend(), "tfjs", tf.version?.tfjs, "+ modelli caricati");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.log("(no env Supabase: salto la validazione su volto reale)"); console.log("SPIKE_OK stack"); process.exit(0); }
  const sb = createClient(url, key);

  const dl = async (p) => { try { const { data } = await sb.storage.from("face-index").download(p); return data ? JSON.parse(await data.text()) : null; } catch { return null; } };
  const index = (await dl("index.json")) || (await dl("protected-index.json"));
  if (!index?.entries?.length) { console.log("(nessun indice volti in storage: salto la comparazione)"); console.log("SPIKE_OK stack"); process.exit(0); }

  const handle = index.entries[0].handle;
  const stored = index.entries.filter((e) => e.handle === handle).map((e) => e.descriptor);
  const { data: files } = await sb.storage.from("references").list(handle);
  const img = (files || []).find((f) => /\.(jpg|jpeg|png|webp)$/i.test(f.name));
  if (!img) { console.log(`(nessuna reference per ${handle}: salto)`); console.log("SPIKE_OK stack"); process.exit(0); }

  const { data: blob } = await sb.storage.from("references").download(`${handle}/${img.name}`);
  const buf = Buffer.from(await blob.arrayBuffer());
  const nodeDescr = await descriptorFromBuffer(buf);
  if (!nodeDescr) { console.log(`ATTENZIONE: nessun volto rilevato in ${handle}/${img.name}`); process.exit(1); }

  let min = Infinity; for (const s of stored) { const d = euclid(nodeDescr, s); if (d < min) min = d; }
  console.log(`VALIDAZIONE volto reale (${handle}, ${img.name}): descr len ${nodeDescr.length}, MIN distanza vs indice browser = ${min.toFixed(4)}`);
  console.log(min < 0.6 ? `=> COMPATIBILE (sotto soglia 0.6${min < 0.4 ? ", ottimo" : ""}): il match funzionera'.` : `=> ATTENZIONE: distanza alta, preprocess da allineare.`);
  console.log("SPIKE_OK full");
} catch (e) {
  console.error("SPIKE_FAIL:", e?.stack || e?.message || e);
  process.exit(1);
}
