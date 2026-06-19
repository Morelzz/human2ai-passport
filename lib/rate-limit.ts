import { createServerClient } from "@/lib/supabase";

// Ritorna true se la richiesta e' AMMESSA, false se ha superato la soglia.
// Non lancia mai: in caso di errore DB "fail open" sul rate-limit (non blocca
// gli utenti veri per un problema infrastrutturale), ma logga.
export async function allowRequest(
  key: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    const admin = createServerClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.warn("[rate-limit] errore RPC, fail-open:", error.message);
      return true;
    }
    return data === true;
  } catch (e) {
    console.warn("[rate-limit] eccezione, fail-open:", (e as Error).message);
    return true;
  }
}

// Chiave per IP (rotte non autenticate) o per utente (rotte autenticate).
export function ipFrom(request: Request): string {
  const xff = request.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0].trim() || "ip-sconosciuto";
}
