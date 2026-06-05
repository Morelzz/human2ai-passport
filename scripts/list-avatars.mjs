// Elenca gli avatar nel registro (per scegliere a quale collegare un Soul ID).
// Uso: node --env-file=.env.local scripts/list-avatars.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Variabili Supabase mancanti in .env.local");
  process.exit(1);
}

const sb = createClient(url, key);
const { data, error } = await sb
  .from("avatars")
  .select("id, handle, alias, tier, gender")
  .order("handle");

if (error) {
  console.error("Errore Supabase:", error.message);
  process.exit(1);
}

for (const a of data) {
  console.log(`${a.handle}  |  ${a.alias}  |  tier=${a.tier}  |  ${a.gender ?? "?"}`);
}
console.log(`\nTotale: ${data.length} avatar`);
