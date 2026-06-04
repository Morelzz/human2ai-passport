import { createClient } from "@supabase/supabase-js";

// Client lato server — usa la service role key (mai esposta al browser)
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variabili Supabase mancanti in .env.local");
  return createClient(url, key);
}
