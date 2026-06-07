// Test ISOLATO di GPT Image 2 (gpt-image-2). Una sola generazione, salva il file,
// stampa "OK" + percorso. In caso di errore stampa status + body ESATTI dell'API.
// La chiave si legge SOLO da process.env.OPENAI_API_KEY (lato server/CLI).
//
// Lancio:  node --env-file=.env.local scripts/test-openai.mjs
//
// NON integra nulla nel sito: serve solo a confermare chiave + modello + billing.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error("ERRORE: OPENAI_API_KEY non presente nell'ambiente. Avvia con --env-file=.env.local");
  process.exit(1);
}

const payload = {
  model: "gpt-image-2",
  prompt: "a single red apple on a white background",
  size: "1024x1024", // la più piccola supportata da gpt-image
  n: 1,
};

console.log("→ Chiamo OpenAI Images API con modello gpt-image-2 …");

let res, text;
try {
  res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  text = await res.text();
} catch (e) {
  console.error("ERRORE di rete:", e?.message ?? e);
  process.exit(1);
}

if (!res.ok) {
  console.error(`ERRORE API — status HTTP ${res.status}`);
  console.error("Body esatto della risposta:");
  console.error(text);
  process.exit(1);
}

let json;
try {
  json = JSON.parse(text);
} catch {
  console.error("Risposta non-JSON inattesa:");
  console.error(text.slice(0, 800));
  process.exit(1);
}

const item = json?.data?.[0];
let buf;
if (item?.b64_json) {
  buf = Buffer.from(item.b64_json, "base64");
} else if (item?.url) {
  const img = await fetch(item.url);
  buf = Buffer.from(await img.arrayBuffer());
} else {
  console.error("Nessuna immagine nella risposta. JSON ricevuto (troncato):");
  console.error(JSON.stringify(json).slice(0, 800));
  process.exit(1);
}

const out = resolve("scripts", "test-openai-output.png");
writeFileSync(out, buf);
console.log("OK");
console.log(out);
console.log(`(${buf.length} byte salvati)`);
