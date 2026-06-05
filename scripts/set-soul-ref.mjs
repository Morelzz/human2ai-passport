// Collega un Soul ID a un avatar (campo soul_ref).
// Uso: node --env-file=.env.local scripts/set-soul-ref.mjs <handle> <soulId>
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Variabili Supabase mancanti"); process.exit(1); }

const handle = process.argv[2];
const soulId = process.argv[3];
if (!handle || !soulId) {
  console.error("Uso: node --env-file=.env.local scripts/set-soul-ref.mjs <handle> <soulId>");
  process.exit(1);
}

const sb = createClient(url, key);
const { data, error } = await sb
  .from("avatars")
  .update({ soul_ref: soulId })
  .eq("handle", handle)
  .select("handle, alias, tier, soul_ref");

if (error) { console.error("Errore Supabase:", error.message); process.exit(1); }
if (!data || data.length === 0) { console.error(`Nessun avatar con handle="${handle}"`); process.exit(1); }

const a = data[0];
console.log(`Collegato: ${a.handle} (${a.alias}, tier=${a.tier}) -> soul_ref=${a.soul_ref}`);
