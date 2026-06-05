// Crea un Soul ID su Higgsfield a partire da una cartella di foto di UN volto reale.
//
// Uso:
//   node --env-file=.env.local scripts/create-soul-id.mjs "C:\percorso\foto" "Nome Soul"
//
// - Il primo argomento è la CARTELLA con le foto (jpg/jpeg/png/webp) dello stesso volto.
// - Il secondo argomento (opzionale) è il nome del Soul (default: nome della cartella).
//
// Lo script: carica ogni foto -> crea il Soul -> attende il training -> stampa l'ID.
// Quell'ID va incollato nel campo `soul_ref` dell'avatar su Supabase.
//
// IMPORTANTE: servono foto REALI di una persona di cui hai i diritti/consenso.
// Consigliato: 5-15 foto nitide, volto ben visibile, angolazioni/espressioni diverse.

import fs from "fs";
import path from "path";
import { HiggsfieldClient } from "@higgsfield/client";

const apiKey = process.env.HIGGSFIELD_API_KEY;
const apiSecret = process.env.HIGGSFIELD_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("Mancano HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET in .env.local");
  process.exit(1);
}

const folder = process.argv[2];
if (!folder) {
  console.error('Uso: node --env-file=.env.local scripts/create-soul-id.mjs "C:\\percorso\\foto" "Nome Soul"');
  process.exit(1);
}
if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
  console.error(`Cartella non trovata: ${folder}`);
  process.exit(1);
}

const soulName = process.argv[3] || path.basename(folder);

// Estensioni immagine supportate -> formato richiesto da uploadImage.
const formatByExt = { ".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".webp": "webp" };

const files = fs
  .readdirSync(folder)
  .filter((f) => formatByExt[path.extname(f).toLowerCase()])
  .map((f) => path.join(folder, f));

if (files.length === 0) {
  console.error("Nessuna immagine (jpg/jpeg/png/webp) trovata nella cartella.");
  process.exit(1);
}
if (files.length < 3) {
  console.warn(`Attenzione: solo ${files.length} foto. Consigliate almeno 5-15 per un buon risultato.`);
}

const client = new HiggsfieldClient({ apiKey, apiSecret });

try {
  console.log(`Carico ${files.length} foto su Higgsfield...`);
  const inputImages = [];
  for (const file of files) {
    const buffer = fs.readFileSync(file);
    const format = formatByExt[path.extname(file).toLowerCase()];
    const url = await client.uploadImage(buffer, format);
    console.log(`  ok: ${path.basename(file)}`);
    inputImages.push({ type: "image_url", image_url: url });
  }

  // Creo SENZA polling: ottengo subito l'ID (il training continua sul server).
  console.log(`Creo il Soul "${soulName}"...`);
  const soul = await client.createSoulId(
    { name: soulName, input_images: inputImages },
    false
  );

  console.log("\n=== SOUL CREATO ===");
  console.log(`Nome:   ${soul.name}`);
  console.log(`ID:     ${soul.id}`);
  console.log(`Status: ${soul.status}`);
  console.log("\nIncolla questo ID nel campo `soul_ref` dell'avatar su Supabase.");
  console.log("Il training prosegue sul server (qualche minuto). Controlla lo stato con:");
  console.log("  node --env-file=.env.local scripts/list-soul-ids.mjs");
} catch (e) {
  console.error("Errore Higgsfield:", e?.message ?? e);
  process.exit(1);
}
