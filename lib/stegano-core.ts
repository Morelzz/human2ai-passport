// ──────────────────────────────────────────────────────────────────────────
// Filigrana INVISIBILE — ALGORITMO PURO (zero sharp, zero DOM).
// Nasconde/legge un codice (il certificato) nei LSB del canale BLU, sparsi su
// tutta l'immagine con una sequenza pseudo-casuale deterministica.
//
// È isomorfo: gira IDENTICO sul server (sul raw RGBA di sharp) e nel browser
// (sull'ImageData del canvas) → UN'unica fonte di verità per l'estrazione, così
// la lettura "sul dispositivo" dei PNG grandi non può divergere da quella server.
//
// ⚠️ L'algoritmo è CONGELATO: il seme è legato alle immagini GIÀ marcate in giro,
// cambiarlo le renderebbe non più verificabili. Non toccare seme/canale/ordine.
// ──────────────────────────────────────────────────────────────────────────

export const MAGIC = "H2A1";
export const MAX_PAYLOAD = 100_000;
const SEED = 0x48324131; // "H2A1" — seme fisso, condiviso da embed/extract
const MAGIC_BYTES = [0x48, 0x32, 0x41, 0x31]; // 'H','2','A','1'

// Buffer di pixel RGBA: Buffer di sharp (server) o ImageData.data del canvas (browser).
type Pixels = Uint8Array | Uint8ClampedArray;

// Ordine deterministico di `steps` pixel distinti su `n` totali (partial
// Fisher-Yates con PRNG xorshift32 seminato fisso). Stesso seme → stessa
// sequenza in embed ed extract. Ritorna gli indici di PIXEL (non di byte).
export function pixelOrder(n: number, steps: number): Uint32Array {
  const idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  let s = SEED >>> 0;
  const rnd = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s >>> 0;
  };
  const m = Math.min(steps, n);
  for (let k = 0; k < m; k++) {
    const j = k + (rnd() % (n - k));
    const t = idx[k]; idx[k] = idx[j]; idx[j] = t;
  }
  return idx.subarray(0, m);
}

function bitsToBytes(bits: number[]): Uint8Array {
  const out = new Uint8Array(bits.length >> 3);
  for (let i = 0; i < out.length; i++) {
    let v = 0;
    for (let k = 0; k < 8; k++) v = (v << 1) | (bits[i * 8 + k] & 1);
    out[i] = v;
  }
  return out;
}

// Legge `numBits` dai LSB del canale blu (offset +2 in RGBA), nell'ordine sparso.
function readSpread(data: Pixels, n: number, numBits: number): number[] {
  const order = pixelOrder(n, numBits);
  const res: number[] = [];
  for (let i = 0; i < order.length; i++) res.push(data[order[i] * 4 + 2] & 1);
  return res;
}

function readU32BE(b: Uint8Array, off: number): number {
  return ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0;
}

// Estrae il certificato nascosto da un buffer RGBA (n = width*height), o null se
// l'immagine non è marcata / è stata ricompressa. `data` deve essere RGBA a 4
// canali: il raw di sharp (`.ensureAlpha().raw()`) o ImageData.data del canvas.
export function extractCertFromRGBA(data: Pixels, n: number): string | null {
  if (n <= 0 || n * 4 > data.length) return null; // buffer più corto del previsto
  const header = bitsToBytes(readSpread(data, n, 64)); // MAGIC(4) + len(4)
  if (header.length < 8) return null;
  for (let i = 0; i < 4; i++) if (header[i] !== MAGIC_BYTES[i]) return null;
  const len = readU32BE(header, 4);
  if (len <= 0 || len > MAX_PAYLOAD) return null;
  const totalBytes = 8 + len;
  if (totalBytes * 8 > n) return null;
  const all = bitsToBytes(readSpread(data, n, totalBytes * 8));
  return new TextDecoder().decode(all.subarray(8, 8 + len));
}

// Nasconde `payload` nei LSB del canale blu di `data` (mutazione IN PLACE del
// buffer RGBA passato). Ritorna false se il payload non entra nell'immagine.
// Usato da embedStego (server, dopo il decode sharp) e dai test.
export function embedCertIntoRGBA(data: Pixels, n: number, payload: string): boolean {
  const body = new TextEncoder().encode(payload);
  const len = body.length;
  const full = new Uint8Array(8 + len);
  full[0] = MAGIC_BYTES[0]; full[1] = MAGIC_BYTES[1]; full[2] = MAGIC_BYTES[2]; full[3] = MAGIC_BYTES[3];
  full[4] = (len >>> 24) & 0xff; full[5] = (len >>> 16) & 0xff; full[6] = (len >>> 8) & 0xff; full[7] = len & 0xff;
  full.set(body, 8);
  const totalBits = full.length * 8;
  if (totalBits > n) return false;
  const order = pixelOrder(n, totalBits);
  for (let bit = 0; bit < totalBits; bit++) {
    const byteIndex = order[bit] * 4 + 2; // canale BLU del pixel scelto
    const b = (full[bit >> 3] >> (7 - (bit & 7))) & 1;
    data[byteIndex] = (data[byteIndex] & 0xfe) | b;
  }
  return true;
}
