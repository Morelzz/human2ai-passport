// ──────────────────────────────────────────────────────────────────────────
// Allarme su DEGRADO (audit A12). Ogni volta che un controllo di tutela gira in
// modalita ridotta (stub, fallback, dipendenza o modelli assenti) lo rendiamo
// VISIBILE: i degradi silenziosi sono i fail-open piu pericolosi su un prodotto
// di tutela. console.error sempre (finisce nei log del worker e di Vercel, ed e
// greppabile); in produzione anche un capture Sentry best-effort. NON lancia mai:
// l'osservabilita non deve poter rompere il flusso che osserva.
// ──────────────────────────────────────────────────────────────────────────

export type DegradationArea =
  | "kyc.stub_used"
  | "kyc.didit_unconfigured"
  | "kyc.dob_missing"
  | "identity_gate.models_unavailable"
  | "veto.scan_unavailable"
  | "ward.discovery_stub"
  | "ward.discovery_angle_failed"
  | "ratelimit.unavailable";

// Ambiente "tipo produzione": Vercel (qualunque env) o NODE_ENV=production.
// Usato sia per gli allarmi sia come guardia per gli stub di sviluppo.
export function isProdLike(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL_ENV);
}

// Registra un degrado di un controllo di tutela in modo visibile.
export function reportDegradation(area: DegradationArea, detail: Record<string, unknown> = {}): void {
  const line = `[SEMBLIC:DEGRADO] ${area} ${JSON.stringify(detail)}`;
  try {
    console.error(line);
  } catch {
    /* niente deve rompere il flusso osservato */
  }
  if (!isProdLike()) return;
  // Import lazy: Sentry solo se presente e inizializzato. Best-effort, mai blocca.
  void (async () => {
    try {
      const Sentry = (await import("@sentry/nextjs")) as unknown as {
        captureMessage?: (message: string, level?: string) => void;
      };
      Sentry.captureMessage?.(line, "warning");
    } catch {
      /* Sentry assente: il console.error e gia l'allarme */
    }
  })();
}
