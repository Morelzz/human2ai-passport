import sharp from "sharp";

// ──────────────────────────────────────────────────────────────────────────
// Filigrana INVISIBILE (steganografia LSB).
// Nasconde un codice segreto (il certificato) nei bit meno significativi dei
// canali RGB dell'immagine. Invisibile all'occhio, estraibile da noi.
//
// Richiede un formato LOSSLESS (PNG): l'output è sempre PNG. La marcatura
// sopravvive a copia/salvataggio PNG, NON a ricompressione JPEG o ridimensionamento
// (per quello servirà un watermark robusto in frequenza / servizio dedicato).
// ──────────────────────────────────────────────────────────────────────────

const MAGIC = "H2A1"; // marcatore: 4 byte ASCII
const MAX_PAYLOAD = 100_000; // guardia in estrazione

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

// Nasconde `payload` (stringa) nei pixel di `input` → ritorna PNG.
export async function embedStego(input: Buffer, payload: string): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info; // channels = 4 (RGBA)

  const body = Buffer.from(payload, "utf8");
  const full = Buffer.concat([Buffer.from(MAGIC, "ascii"), u32(body.length), body]);
  const totalBits = full.length * 8;

  const usableBytes = width * height * 3; // salta il canale alpha
  if (totalBits > usableBytes) throw new Error("payload troppo grande per questa immagine");

  let bit = 0;
  for (let i = 0; i < data.length && bit < totalBits; i++) {
    if (i % 4 === 3) continue; // non toccare l'alpha
    const byteIndex = bit >> 3;
    const bitIndex = 7 - (bit & 7);
    const b = (full[byteIndex] >> bitIndex) & 1;
    data[i] = (data[i] & 0xfe) | b;
    bit++;
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

// Legge i primi `numBits` LSB utili (canali RGB, salta alpha).
function readLSBs(data: Buffer, numBits: number): number[] {
  const res: number[] = [];
  for (let i = 0; i < data.length && res.length < numBits; i++) {
    if (i % 4 === 3) continue;
    res.push(data[i] & 1);
  }
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
  const data = raw.data;

  const header = bitsToBytes(readLSBs(data, 64)); // 8 byte: MAGIC(4) + len(4)
  if (header.length < 8 || header.subarray(0, 4).toString("ascii") !== MAGIC) return null;
  const len = header.readUInt32BE(4);
  if (len <= 0 || len > MAX_PAYLOAD) return null;

  const totalBytes = 8 + len;
  if (totalBytes * 8 > (data.length / 4) * 3) return null;
  const all = bitsToBytes(readLSBs(data, totalBytes * 8));
  return all.subarray(8, 8 + len).toString("utf8");
}
