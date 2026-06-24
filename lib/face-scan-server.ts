import { loadProtectedIndex } from "@/lib/protected-index";
import { FACE_MATCH_MAX_DISTANCE, rankFaceMatches } from "@/lib/face-index";
import { reportDegradation } from "@/lib/observability";
import { loadFaceApi } from "@/lib/ward/matching/embed";

// ──────────────────────────────────────────────────────────────────────────
// Fase 2.3 (modulo VETO): scan dei volti GENERATI contro l'indice dei protetti,
// lato SERVER (worker). E' la difesa in PROFONDITA' dopo il gate input (2.2):
// se un contenuto generato somiglia troppo a un volto protetto, va scartato.
//
// CRIT-7: usa lo STESSO stack WASM del KYC (lib/ward/matching/embed: face-api
// node-wasm + backend wasm prebuilt, nessun binario nativo) -> gira sul worker
// Railway senza tfjs-node ne' build-deps native; i modelli sono in public/models.
//
// FAIL-CLOSED: se ci sono volti protetti da controllare ma lo scanner non puo'
// girare (modelli/wasm assenti o errore di scan), NON rilasciamo l'immagine:
// torniamo available:false e il chiamante (lib/echo-job) annulla la generazione.
// Su un prodotto di tutela un controllo che non puo' girare deve bloccare, non
// passare in silenzio.
// ──────────────────────────────────────────────────────────────────────────

export interface OutputScanResult {
  available: boolean; // false = scan non eseguibile (modelli/wasm assenti o errore) -> il chiamante FAIL-CLOSED
  blocked: boolean; // true = un volto generato somiglia a un protetto
  distance?: number;
  handle?: string;
}

// Decisione PURA sull'esito dello scan, testabile senza face-api:
//  - "unavailable": lo scan non ha potuto verificare -> fail-closed (annulla).
//  - "regenerate": un volto somiglia a un protetto -> rigenera (o annulla al limite).
//  - "release": nessun match (o nessun protetto da controllare) -> consegna.
export function outputScanVerdict(scan: OutputScanResult): "unavailable" | "regenerate" | "release" {
  if (!scan.available) return "unavailable";
  if (scan.blocked) return "regenerate";
  return "release";
}

// Confronta TUTTI i volti dell'immagine generata con l'indice protetti.
export async function scanGeneratedImageForProtected(png: Buffer): Promise<OutputScanResult> {
  // Nessun protetto registrato: nulla da scansionare (e nessun costo di modelli).
  const index = await loadProtectedIndex();
  if (!index || index.entries.length === 0) return { available: true, blocked: false };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let faceapi: any;
  try {
    faceapi = await loadFaceApi();
  } catch {
    // Ci sono protetti da controllare ma lo scanner non e' disponibile: DEGRADO
    // visibile (audit A12) + fail-closed (available:false) -> il chiamante annulla.
    reportDegradation("veto.scan_unavailable", { protectedEntries: index.entries.length, phase: "load" });
    return { available: false, blocked: false };
  }

  try {
    const sharpMod = await import("sharp");
    const sharp = sharpMod.default ?? sharpMod;
    const tf = faceapi.tf;
    // Decodifica come nel KYC (sharp -> raw RGB -> tensor): niente tf.node nativo.
    const { data, info } = await sharp(png).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);
    try {
      const dets: { descriptor: Float32Array }[] = await faceapi
        .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptors();
      for (const d of dets) {
        const ranked = rankFaceMatches(Array.from(d.descriptor), index);
        const best = ranked[0];
        if (best && best.distance <= FACE_MATCH_MAX_DISTANCE) {
          return { available: true, blocked: true, distance: best.distance, handle: best.handle };
        }
      }
      return { available: true, blocked: false };
    } finally {
      tensor.dispose();
    }
  } catch {
    // Errore durante lo scan: non possiamo garantire la verifica -> fail-closed.
    reportDegradation("veto.scan_unavailable", { protectedEntries: index.entries.length, phase: "scan" });
    return { available: false, blocked: false };
  }
}
