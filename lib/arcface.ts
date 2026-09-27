// ──────────────────────────────────────────────────────────────────────────
// IL MISURATORE SERIO (27/9/2026). Il descrittore di oggi (face-api, 128
// numeri) e' troppo buono: una Chiara che per Morelz "non era lei" usciva al
// 91%, e ragazze diverse di Soul 2 al 60-70%. Qui il volto si misura con SFace
// (OpenCV Zoo, famiglia ArcFace, licenza Apache 2.0: si puo' usare in un
// prodotto commerciale, a differenza dei modelli InsightFace).
//
// Il procedimento e' quello di ArcFace: cinque punti del volto (occhi, naso,
// angoli della bocca) portati sul modello standard 112x112 con una trasformazione
// di similitudine, poi il modello da' 128 numeri e si confrontano col coseno.
// Il rilevamento e i 68 punti li fa ancora face-api (gia' nel progetto).
// SERVER-ONLY (onnxruntime-node).
// ──────────────────────────────────────────────────────────────────────────

// Il modello standard di ArcFace per 112x112: occhio a sinistra nell'immagine,
// occhio a destra, punta del naso, angolo sinistro e destro della bocca.
export const MODELLO_112: [number, number][] = [
  [38.2946, 51.6963],
  [73.5318, 51.5014],
  [56.0252, 71.7366],
  [41.5493, 92.3655],
  [70.7299, 92.2041],
];

type P = [number, number];

/** I cinque punti dai 68 di face-api (indici standard iBUG). */
export function cinquePunti(punti68: { x: number; y: number }[]): P[] {
  const media = (da: number, a: number): P => {
    let x = 0, y = 0;
    for (let i = da; i <= a; i++) { x += punti68[i].x; y += punti68[i].y; }
    const n = a - da + 1;
    return [x / n, y / n];
  };
  return [media(36, 41), media(42, 47), [punti68[30].x, punti68[30].y], [punti68[48].x, punti68[48].y], [punti68[54].x, punti68[54].y]];
}

/** Similitudine (scala, rotazione, spostamento) da src a dst, minimi quadrati (Umeyama, senza riflessione). */
export function similitudine(src: P[], dst: P[]): { a: number; b: number; tx: number; ty: number } {
  const n = src.length;
  let sx = 0, sy = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { sx += src[i][0]; sy += src[i][1]; dx += dst[i][0]; dy += dst[i][1]; }
  sx /= n; sy /= n; dx /= n; dy /= n;
  let num1 = 0, num2 = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const x = src[i][0] - sx, y = src[i][1] - sy;
    const u = dst[i][0] - dx, v = dst[i][1] - dy;
    num1 += x * u + y * v;
    num2 += x * v - y * u;
    den += x * x + y * y;
  }
  const a = num1 / den, b = num2 / den; // [a -b; b a]
  return { a, b, tx: dx - (a * sx - b * sy), ty: dy - (b * sx + a * sy) };
}

/** Il volto allineato 112x112 come tensore NCHW RGB 0-255, lettura bilineare dall'immagine RGB. */
export function allinea(rgb: Uint8Array, w: number, h: number, punti: P[]): Float32Array {
  const { a, b, tx, ty } = similitudine(punti, MODELLO_112);
  // inversa di [a -b; b a] + t
  const det = a * a + b * b;
  const ia = a / det, ib = -b / det;
  const out = new Float32Array(3 * 112 * 112);
  for (let v = 0; v < 112; v++) {
    for (let u = 0; u < 112; u++) {
      const px = u - tx, py = v - ty;
      const x = ia * px - ib * py;
      const y = ib * px + ia * py;
      const x0 = Math.floor(x), y0 = Math.floor(y);
      const fx = x - x0, fy = y - y0;
      for (let c = 0; c < 3; c++) {
        const val = (xx: number, yy: number) => (xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : rgb[(yy * w + xx) * 3 + c]);
        const p = val(x0, y0) * (1 - fx) * (1 - fy) + val(x0 + 1, y0) * fx * (1 - fy) + val(x0, y0 + 1) * (1 - fx) * fy + val(x0 + 1, y0 + 1) * fx * fy;
        out[c * 112 * 112 + v * 112 + u] = p;
      }
    }
  }
  return out;
}

export function normalizza(v: Float32Array | number[]): number[] {
  let s = 0;
  for (const x of v) s += x * x;
  const n = Math.sqrt(s) || 1;
  return Array.from(v, (x) => x / n);
}

export function coseno(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** La media normalizzata dei riferimenti: l'impronta della persona. */
export function impronta(riferimenti: number[][]): number[] | null {
  if (!riferimenti.length) return null;
  const m = new Array(riferimenti[0].length).fill(0);
  for (const r of riferimenti) for (let i = 0; i < r.length; i++) m[i] += r[i];
  return normalizza(m);
}

// ── Il modello, caricato una volta ────────────────────────────────────────────
type Sessione = { run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array }>> };
let sessione: Promise<{ s: Sessione; Tensor: new (t: string, d: Float32Array, dims: number[]) => unknown }> | null = null;

// Il modello (38 MB) non sta nel repository: al primo uso si scarica nella
// cartella temporanea del server e si controlla l'impronta. Un file diverso
// da quello provato il 27/9 non si carica.
const URL_MODELLO = "https://huggingface.co/opencv/face_recognition_sface/resolve/main/face_recognition_sface_2021dec.onnx";
const SHA256_MODELLO = "0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79";

async function percorsoModello(): Promise<string> {
  if (process.env.SFACE_MODELLO) return process.env.SFACE_MODELLO;
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const fs = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const file = join(tmpdir(), "semblic-sface-2021dec.onnx");
  const giusto = async () => {
    try { return createHash("sha256").update(await fs.readFile(file)).digest("hex") === SHA256_MODELLO; } catch { return false; }
  };
  if (await giusto()) return file;
  const r = await fetch(URL_MODELLO);
  if (!r.ok) throw new Error(`modello SFace: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (createHash("sha256").update(buf).digest("hex") !== SHA256_MODELLO) throw new Error("modello SFace: impronta diversa");
  await fs.writeFile(file, buf);
  return file;
}

async function carica() {
  if (!sessione) {
    sessione = (async () => {
      const ort = await import("onnxruntime-node");
      const s = await ort.InferenceSession.create(await percorsoModello(), { logSeverityLevel: 3 });
      return { s: s as unknown as Sessione, Tensor: ort.Tensor as unknown as new (t: string, d: Float32Array, dims: number[]) => unknown };
    })();
    // Se non si carica (niente rete, niente modulo), si riprova alla prossima.
    sessione.catch(() => { sessione = null; });
  }
  return sessione;
}

/** Il volto in 128 numeri SFace, o null se il misuratore serio non e' disponibile. */
export async function descrittoreArcSicuro(rgb: Uint8Array, w: number, h: number, punti68: { x: number; y: number }[]): Promise<number[] | null> {
  try {
    return await descrittoreArc(allinea(rgb, w, h, cinquePunti(punti68)));
  } catch (e) {
    if (!avvisato) { avvisato = true; console.warn(`[arcface] misuratore serio non disponibile, resta face-api: ${(e as Error).message}`); }
    return null;
  }
}
let avvisato = false;

// Coseno SFace sulla stessa scala delle distanze di face-api, cosi' soglie,
// percentuali e verdetti restano quelli. Banco del 27/9 (21 foto vere di 6
// persone, 7 sconosciute di Soul 2, 105 confronti fra persone diverse): vere
// 0,685-0,845, sconosciute 0,335-0,599, persone diverse fino a 0,507. Con
// questa scala 0,65 cade su 0,5, la soglia "e' lei" di tutto il sistema.
export function distanzaDaCoseno(c: number): number {
  return Math.max(0, 0.5 + (0.65 - c) * 2);
}

/** 128 numeri normalizzati per un volto allineato. */
export async function descrittoreArc(allineato: Float32Array): Promise<number[]> {
  const { s, Tensor } = await carica();
  const out = await s.run({ data: new Tensor("float32", allineato, [1, 3, 112, 112]) });
  return normalizza(out.fc1.data);
}
