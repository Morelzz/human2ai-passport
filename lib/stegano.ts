import sharp from "sharp";

// ──────────────────────────────────────────────────────────────────────────
// Filigrana INVISIBILE (steganografia LSB) — versione "ultra-fine".
// Nasconde un codice segreto (il certificato) in UN solo canale (blu, il meno
// percepibile) e lo SPARGE su tutta l'immagine con una sequenza pseudo-casuale
// deterministica → densità bassissima, invisibile anche zoomando. Estraibile
// solo dal nostro analizzatore (conosce seme + schema).
//
// Richiede PNG (lossless): sopravvive a copia/salvataggio PNG, NON a JPEG/resize
// (per quello servirà un watermark robusto in frequenza, servizio dedicato).
// NB: cambia lo schema rispetto alla versione precedente — leggibile solo da
// immagini marcate con QUESTA versione (i contenuti si ri-marcano al download).
// ──────────────────────────────────────────────────────────────────────────

const MAGIC = "H2A1";
const MAX_PAYLOAD = 100_000;
const SEED = 0x48324131; // "H2A1" — seme fisso, condiviso da embed/extract

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function bitsToBytes(bits: number[]): Buffer {
  const out = Buffer.alloc(bits.length >> 3);
  for (let i = 0; i < out.length; i++) {
    let v = 0;
    for (let k = 0; k < 8; k++) v = (v << 1) | (bits[i * 8 + k] & 1);
    out[i] = v;
  }
  return out;
}

// Ordine deterministico di `steps` pixel distinti su `n` totali (partial
// Fisher-Yates con PRNG xorshift32 seminato fisso). Stesso seme → stessa
// sequenza in embed ed extract. Ritorna gli indici di PIXEL (non di byte).
function pixelOrder(n: number, steps: number): Uint32Array {
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

// Nasconde `payload` (stringa) nei pixel di `input` → ritorna PNG.
export async function embedStego(input: Buffer, payload: string): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info; // channels = 4 (RGBA)
  const n = width * height;

  const body = Buffer.from(payload, "utf8");
  const full = Buffer.concat([Buffer.from(MAGIC, "ascii"), u32(body.length), body]);
  const totalBits = full.length * 8;
  if (totalBits > n) throw new Error("payload troppo grande per questa immagine");

  const order = pixelOrder(n, totalBits);
  for (let bit = 0; bit < totalBits; bit++) {
    const byteIndex = order[bit] * 4 + 2; // canale BLU del pixel scelto
    const b = (full[bit >> 3] >> (7 - (bit & 7))) & 1;
    data[byteIndex] = (data[byteIndex] & 0xfe) | b;
  }

  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// Legge `numBits` dai LSB del canale blu, nell'ordine sparso deterministico.
function readSpread(data: Buffer, n: number, numBits: number): number[] {
  const order = pixelOrder(n, numBits);
  const res: number[] = [];
  for (let i = 0; i < order.length; i++) res.push(data[order[i] * 4 + 2] & 1);
  return res;
}

// Estrae il payload nascosto, o null se l'immagine non è marcata/è stata ricompressa.
export async function extractStego(input: Buffer): Promise<string | null> {
  let raw;
  try {
    raw = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  } catch {
    return null;
  }
  const { data, info } = raw;
  const n = info.width * info.height;

  const header = bitsToBytes(readSpread(data, n, 64)); // MAGIC(4) + len(4)
  if (header.length < 8 || header.subarray(0, 4).toString("ascii") !== MAGIC) return null;
  const len = header.readUInt32BE(4);
  if (len <= 0 || len > MAX_PAYLOAD) return null;

  const totalBytes = 8 + len;
  if (totalBytes * 8 > n) return null;
  const all = bitsToBytes(readSpread(data, n, totalBytes * 8));
  return all.subarray(8, 8 + len).toString("utf8");
}
