import path from "node:path";
import { createRequire } from "node:module";

// Embedding server-side dei CANDIDATI con face-api (build node-wasm + backend WASM
// prebuilt: nessun binario nativo). LAZY: face-api/tfjs/sharp si caricano al primo
// embed e i modelli restano in cache per la vita del processo (worker). Porta
// fedele dello spike validato (worker/face-spike.mjs: distanza 0.10 = compatibile).
// L'import dinamico tiene questo modulo leggero finche' non si embedda davvero,
// cosi' i test che iniettano un fake non caricano mai face-api.

export interface EmbedResult {
  descriptor: number[] | null; // 128-d FaceNet, o null se nessun volto
  faceCount: number;           // volti rilevati nell'immagine
}

let faceApiPromise: Promise<any> | null = null;

function modelsDir(): string {
  return process.env.WARD_MODELS_DIR || path.join(process.cwd(), "public", "models");
}

// Carica face-api (node-wasm) + backend wasm + i 3 modelli, UNA volta sola.
async function loadFaceApi(): Promise<any> {
  if (faceApiPromise) return faceApiPromise;
  faceApiPromise = (async () => {
    const ns: any = await import("@vladmandic/face-api/dist/face-api.node-wasm.js");
    const faceapi: any = ns?.nets ? ns : ns.default;
    const wasm: any = await import("@tensorflow/tfjs-backend-wasm");
    const setWasmPaths = wasm.setWasmPaths ?? wasm.default?.setWasmPaths;

    const require = createRequire(import.meta.url);
    const wasmDir =
      path.join(path.dirname(require.resolve("@tensorflow/tfjs-backend-wasm/package.json")), "dist") + "/";
    setWasmPaths(wasmDir);

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
    if (faceCount === 0) return { descriptor: null, faceCount };
    let best = dets[0];
    for (const d of dets) {
      if (d.detection.box.area > best.detection.box.area) best = d;
    }
    return { descriptor: Array.from(best.descriptor as Float32Array), faceCount };
  } finally {
    t.dispose();
  }
}
