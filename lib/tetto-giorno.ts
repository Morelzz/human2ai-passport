import type { createServerClient } from "@/lib/supabase";

// Tetto di spesa giornaliero sul motore delle foto (19/9/2026, Morelz: "dosiamo
// i crediti"). Somma il costo STIMATO (prudente, piu' alto del reale) dei lavori
// accettati da mezzanotte, ora italiana, esclusi quelli finiti in errore (non
// pagati al motore). Se il nuovo scatto supera il tetto, si ferma PRIMA di
// spendere VOLT o crediti. Si cambia con ECHO_TETTO_GIORNO_CENT (0 = nessun tetto).

type Admin = ReturnType<typeof createServerClient>;

export const TETTO_PREDEFINITO_CENT = 300;

export function tettoGiorno(): number {
  const v = Number(process.env.ECHO_TETTO_GIORNO_CENT);
  return Number.isFinite(v) && v >= 0 && process.env.ECHO_TETTO_GIORNO_CENT !== "" && process.env.ECHO_TETTO_GIORNO_CENT !== undefined
    ? v
    : TETTO_PREDEFINITO_CENT;
}

// Mezzanotte di oggi in Italia, come istante ISO (gestisce ora legale e solare).
export function mezzanotteItalia(ora = new Date()): string {
  const giorno = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(ora);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", timeZoneName: "shortOffset" })
    .formatToParts(ora).find((p) => p.type === "timeZoneName")?.value.replace("GMT", "") || "+0";
  const [h, m = "0"] = offset.split(":");
  const segno = h.startsWith("-") ? "-" : "+";
  const hh = String(Math.abs(Number(h))).padStart(2, "0");
  return new Date(`${giorno}T00:00:00${segno}${hh}:${m.padStart(2, "0")}`).toISOString();
}

export function sforaTetto(spesiOggi: number, nuovo: number, tetto: number): boolean {
  return tetto > 0 && spesiOggi + nuovo > tetto;
}

export async function spesaMotoreOggi(admin: Admin): Promise<number> {
  const { data } = await admin
    .from("generation_jobs")
    .select("params, status")
    .gte("created_at", mezzanotteItalia())
    .neq("status", "error");
  return (data ?? []).reduce((s, j) => {
    const c = (j.params as { pricing?: { surcharge_cents?: number } } | null)?.pricing?.surcharge_cents;
    return s + (typeof c === "number" ? c : 0);
  }, 0);
}
