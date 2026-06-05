// Verifica connettività Higgsfield + elenco Soul ID.
// Uso: node --env-file=.env.local scripts/list-soul-ids.mjs
import { HiggsfieldClient } from "@higgsfield/client";

const apiKey = process.env.HIGGSFIELD_API_KEY;
const apiSecret = process.env.HIGGSFIELD_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("Mancano HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET in .env.local");
  process.exit(1);
}

const client = new HiggsfieldClient({ apiKey, apiSecret });

try {
  const res = await client.listSoulIds(1, 100);
  console.log(`Totale Soul ID: ${res.total}`);
  for (const s of res.items) {
    console.log(`- ${s.name}  |  id=${s.id}  |  status=${s.status}`);
  }
} catch (e) {
  console.error("Errore chiamata Higgsfield:", e?.message ?? e);
  process.exit(1);
}
