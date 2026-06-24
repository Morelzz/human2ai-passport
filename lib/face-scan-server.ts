import { loadProtectedIndex } from "@/lib/protected-index";
import { FACE_MATCH_MAX_DISTANCE, rankFaceMatches } from "@/lib/face-index";
import { reportDegradation } from "@/lib/observability";

// ──────────────────────────────────────────────────────────────────────────
// Fase 2.3 (modulo VETO): scan dei volti GENERATI contro l'indice dei protetti,
// lato SERVER (worker). E' la difesa in PROFONDITA' dopo il gate input (2.2):
// se un contenuto generato somiglia troppo a un volto protetto, va scartato.
//
// Richiede face-detection server-side (@tensorflow/tfjs-node + @vladmandic/face-api).
// Import DINAMICO con specifier a variabile: se la dipendenza o i modelli non ci
// sono, tsc non la risolve e a runtime lo scan resta DORMIENTE (available:false)
// → la generazione viene rilasciata, nessun crash. Dove tfjs-node e' installato
// (worker Railway), lo scan e' ATTIVO. I modelli sono gia' in public/models.
//
// Fail-open in caso di errore dello scan: il gate input (2.2) + l'esclusione dal
// match restano la difesa primaria; lo scan output non deve bloccare il prodotto
// se il rilevatore va in errore.
// ──────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loaded: { faceapi: any; ok: boolean } | null = null;

async function ensureServerFace(): Promise<{ faceapi: unknown; ok: boolean }> {
  if (loaded) return loaded;
  try {
    // Specifier a VARIABILE: tsc non prova a risolvere il modulo (dormiente-safe
    // finche' non e' installato). tfjs-node registra il backend nativo in Node.
    const tfjsNode = "@tensorflow/tfjs-node";
    await import(/* webpackIgnore: true */ tfjsNode);
    const faceApiSpec = "@vladmandic/face-api";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const faceapi: any = await import(/* webpackIgnore: true */ faceApiSpec);
    const modelsDir = `${process.cwd()}/public/models`;
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsDir);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsDir);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsDir);
    loaded = { faceapi, ok: true };
  } catch {
    loaded = { faceapi: null, ok: false };
  }
  return loaded;
}

export interface OutputScanResult {
  available: boolean; // false = scan dormiente (dep/modelli assenti o errore)
  blocked: boolean; // true = un volto generato somiglia a un protetto
  distance?: number;
  handle?: string;
}

// Confronta TUTTI i volti dell'immagine generata con l'indice protetti.
export async function scanGeneratedImageForProtected(png: Buffer): Promise<OutputScanResult> {
  // Nessun protetto registrato: nulla da scansionare (e nessun costo di modelli).
  const index = await loadProtectedIndex();
  if (!index || index.entries.length === 0) return { available: true, blocked: false };

  const { faceapi, ok } = await ensureServerFace();
  if (!ok) {
    // Ci sono protetti da controllare ma lo scanner non e disponibile
    // (tfjs-node/modelli assenti): DEGRADO da rendere visibile (audit A12, CRIT-7).
    reportDegradation("veto.scan_unavailable", { protectedEntries: index.entries.length });
    return { available: false, blocked: false };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = faceapi as any;
    const tensor = f.tf.node.decodeImage(png, 3);
    const dets = await f
      .detectAllFaces(tensor, new f.SsdMobilenetv1Options({ minConfidence: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
    f.tf.dispose(tensor);
    for (const d of dets) {
      const ranked = rankFaceMatches(Array.from(d.descriptor as Float32Array), index);
      const best = ranked[0];
      if (best && best.distance <= FACE_MATCH_MAX_DISTANCE) {
        return { available: true, blocked: true, distance: best.distance, handle: best.handle };
      }
    }
    return { available: true, blocked: false };
  } catch {
    return { available: false, blocked: false }; // fail-open (vedi nota in testa)
  }
}
