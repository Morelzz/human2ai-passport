// Le due foto della prima pagina, dalle fonti vere (27/9/2026):
// - foto-scatto: lo scatto certificato d20b966b1352 (Gabriella, orizzontale,
//   alta qualita', 0,50 euro, 0,11 euro a lei), intero;
// - ritratto: il ritratto pubblico di Gabriella dal registro.
// Entrambe con la filigrana visibile di Semblic, come ogni foto pubblica.
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { watermarkBytes } from "../../../lib/watermark.ts";

const SCATTO = "https://ktjebfavzherochwhtis.supabase.co/storage/v1/object/public/generations/565af152-2b28-47a2-8b35-f57442da105c/87b2bda5-638c-4659-9fc9-79096ef3d532.png";
const OUT = "public/home";

const orig = Buffer.from(await (await fetch(SCATTO)).arrayBuffer());
const m = await sharp(orig).metadata();
console.log("scatto", m.width, m.height);
// Gia orizzontale: si porta al rapporto del riquadro, centrato.
const w = m.width!;
const h = Math.min(m.height!, Math.round(w / 1.4923));
const top = Math.max(0, Math.round((m.height! - h) / 2));
const tagliato = await sharp(orig).extract({ left: 0, top, width: w, height: h }).png().toBuffer();
const conFiligrana = await watermarkBytes(tagliato, w);
writeFileSync(`${OUT}/scatto-gabriella.jpg`, await sharp(conFiligrana).jpeg({ quality: 84, mozjpeg: true }).toBuffer());

const rit = Buffer.from(await (await fetch("http://localhost:3000/api/sample/gabriella/0?w=720")).arrayBuffer());
const r = await sharp(rit).metadata();
const rw = r.width!, rh = Math.round(rw * 190 / 161);
writeFileSync(`${OUT}/ritratto-gabriella.jpg`, await sharp(rit).extract({ left: 0, top: 0, width: rw, height: Math.min(rh, r.height!) }).jpeg({ quality: 84, mozjpeg: true }).toBuffer());
console.log("ok", w, h, "top", top, "ritratto", rw, Math.min(rh, r.height!));
