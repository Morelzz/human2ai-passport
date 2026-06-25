import path from "node:path";
import { createRequire } from "node:module";
import { frontalityFromLandmarks } from "./frontality";

// Embedding server-side dei CANDIDATI con face-api (build node-wasm + backend WASM
// prebuilt: nessun binario nativo). LAZY: face-api/tfjs/sharp si caricano al primo
// embed e i modelli restano in cache per la vita del processo (worker). Porta
// fedele dello spike validato (worker/face-spike.mjs: distanza 0.10 = compatibile).
// L'import dinamico tiene questo modulo leggero finche' non si embedda davvero,
// cosi' i test che iniettano un fake non caricano mai face-api.

export interface EmbedResult {
  descriptor: number[] | null; // 128-d FaceNet, o null se nessun volto
  faceCount: number;           // volti rilevati nell'immagine
  frontality: number | null;   // [0,1] del volto piu' grande (1=frontale), null se nessun volto
}

let faceApiPromise: Promise<any> | null = null;

function modelsDir(): string {
  return process.env.WARD_MODELS_DIR || path.join(process.cwd(), "public", "models");
}

// Cartella dei .wasm del backend tfjs. ATTENZIONE (verificato a terra sul build
// di prod): Next 16 builda con Turbopack, che NON restituisce un path da
// `require.resolve` di un pacchetto external (serverExternalPackages). Prima il
// codice faceva `path.dirname(require.resolve(...))` e su Vercel serverless quel
// resolve tornava un id numerico -> `path.dirname(<numero>)` esplodeva con
// ERR_INVALID_ARG_TYPE = 500 dello scan Ward + gate KYC rotto. Ora: si TENTA il
// resolve (utile in ambienti non bundlati: vitest, worker non-pruned) e si CADE
// su un path stabile sotto cwd. Nel bundle Turbopack di prod il ramo resolve viene
// eliminato e resta solo il fallback, che e' corretto: i .wasm sono copiati in
// node_modules/@tensorflow/tfjs-backend-wasm/dist via outputFileTracingIncludes.
function wasmDir(): string {
  try {
    const nodeRequire = createRequire(import.meta.url);
    const pkg = nodeRequire.resolve("@tensorflow/tfjs-backend-wasm/package.json");
    if (typeof pkg === "string") return path.join(path.dirname(pkg), "dist") + "/";
  } catch {
    // cade al fallback sotto
  }
  return path.join(process.cwd(), "node_modules", "@tensorflow", "tfjs-backend-wasm", "dist") + "/";
}

// Carica face-api (node-wasm) + backend wasm + i 3 modelli, UNA volta sola.
// Esportata per riuso dal VETO scan (lib/face-scan-server): stesso stack WASM,
// nessun binario nativo, gira sul worker come il KYC.
export async function loadFaceApi(): Promise<any> {
  if (faceApiPromise) return faceApiPromise;
  faceApiPromise = (async () => {
    const ns: any = await import("@vladmandic/face-api/dist/face-api.node-wasm.js");
    const faceapi: any = ns?.nets ? ns : ns.default;
    const wasm: any = await import("@tensorflow/tfjs-backend-wasm");
    const setWasmPaths = wasm.setWasmPaths ?? wasm.default?.setWasmPaths;

    setWasmPaths(wasmDir());

    const tf = faceapi.tf;
    await tf.setBackend("wasm");
    await tf.ready();

    const dir = modelsDir();
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(dir);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(dir);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(dir);
    return faceapi;
  })();
  return faceApiPromise;
}

// Decodifica i bytes (sharp -> raw RGB) e ritorna il descrittore del volto piu'
// GRANDE (come fa il client per i candidati). MAI ritorna/persiste i crop o i
// bytes del candidato: il chiamante riceve solo il descrittore effimero.
export async function embed(imageBytes: Uint8Array): Promise<EmbedResult> {
  const faceapi = await loadFaceApi();
  const sharpMod: any = await import("sharp");
  const sharp = sharpMod.default ?? sharpMod;
  const tf = faceapi.tf;

  const { data, info } = await sharp(Buffer.from(imageBytes))
    .rotate()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const t = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);
  try {
    const dets: any[] = await faceapi.detectAllFaces(t).withFaceLandmarks().withFaceDescriptors();
    const faceCount = dets.length;
    if (faceCount === 0) return { descriptor: null, faceCount, frontality: null };
    let best = dets[0];
    for (const d of dets) {
      if (d.detection.box.area > best.detection.box.area) best = d;
    }
    const positions = (best.landmarks?.positions ?? []).map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }));
    const frontality = positions.length ? frontalityFromLandmarks(positions) : null;
    return { descriptor: Array.from(best.descriptor as Float32Array), faceCount, frontality };
  } finally {
    t.dispose();
  }
}
