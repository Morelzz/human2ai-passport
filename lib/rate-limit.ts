import { createServerClient } from "@/lib/supabase";
import { reportDegradation } from "@/lib/observability";

// Ritorna true se la richiesta e' AMMESSA, false se ha superato la soglia.
// Non lancia mai: in caso di errore DB "fail open" sul rate-limit (non blocca
// gli utenti veri per un problema infrastrutturale), ma rende VISIBILE il degrado
// (reportDegradation): un rate-limit cieco lascia scoperti i costi a valle (es. lo
// scan Ward consuma Google Vision), quindi un'interruzione non deve passare muta.
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
      reportDegradation("ratelimit.unavailable", { reason: "rpc_error", msg: error.message });
      return true;
    }
    return data === true;
  } catch (e) {
    reportDegradation("ratelimit.unavailable", { reason: "exception", msg: (e as Error).message });
    return true;
  }
}

// Chiave per IP (rotte non autenticate) o per utente (rotte autenticate).
export function ipFrom(request: Request): string {
  const xff = request.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0].trim() || "ip-sconosciuto";
}
