// La mappa dei punti per la scena "Il volto di punti" (27/9/2026).
// Dal ritratto originale di una persona del registro fa un PNG piccolissimo
// (una cella = un punto) con il fondo gia' trasparente. Nel browser arriva solo
// questa griglia, mai la foto in alta risoluzione.
// Uso: node scripts/volto-punti.mjs <url-ritratto> <file-uscita> [colonne] [altezza 0-1]
import sharp from "sharp";

const [, , url, uscita, colArg, altArg] = process.argv;
if (!url || !uscita) {
  console.error("uso: node scripts/volto-punti.mjs <url-ritratto> <file-uscita> [colonne]");
  process.exit(1);
}
const colonne = Number(colArg ?? 118);
const quota = Number(altArg ?? 1); // quanta parte dall'alto tenere (1 = tutta)

const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
const meta = await sharp(buf).metadata();
const { data, info } = await sharp(buf)
  .extract({ left: 0, top: 0, width: meta.width, height: Math.round(meta.height * quota) })
  .resize({ width: colonne })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const px = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
const diff = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

// Fondo: si cresce dai bordi passando da un punto al vicino finche' il colore
// cambia poco (segue le sfumature dello studio), e ci si ferma sui bordi netti
// di capelli e pelle. Un tetto sulla distanza dal colore dei bordi evita di
// entrare nella pelle chiara.
const bordo = [0, 1, 2].map((k) => {
  let s = 0, n = 0;
  for (let x = 0; x < W; x++) { s += data[x * 3 + k]; n++; }
  return s / n;
});
const fondo = new Uint8Array(W * H);
const coda = [];
for (let x = 0; x < W; x++) coda.push([x, -1]);
if (quota >= 1) for (let x = 0; x < W; x++) coda.push([(H - 1) * W + x, -1]);
for (let y = 0; y < H; y++) coda.push([y * W, -1], [y * W + W - 1, -1]);
while (coda.length) {
  const [i, da] = coda.pop();
  if (fondo[i]) continue;
  const c = px(i);
  if (diff(c, bordo) > 120) continue;
  if (da >= 0 && diff(c, px(da)) > 20) continue;
  fondo[i] = 1;
  const x = i % W, y = (i / W) | 0;
  if (x > 0) coda.push([i - 1, i]);
  if (x < W - 1) coda.push([i + 1, i]);
  if (y > 0) coda.push([i - W, i]);
  if (y < H - 1) coda.push([i + W, i]);
}

const rgba = Buffer.alloc(W * H * 4);
let tenuti = 0;
for (let i = 0; i < W * H; i++) {
  rgba[i * 4] = data[i * 3];
  rgba[i * 4 + 1] = data[i * 3 + 1];
  rgba[i * 4 + 2] = data[i * 3 + 2];
  rgba[i * 4 + 3] = fondo[i] ? 0 : 255;
  if (!fondo[i]) tenuti++;
}
await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(uscita);
console.log(`ok ${W}x${H}, ${tenuti} punti, ${uscita}`);
