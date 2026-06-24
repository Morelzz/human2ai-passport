import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { appendAudit } from "@/lib/ward/audit";
import { isProdLike, reportDegradation } from "@/lib/observability";

export const runtime = "nodejs";

// STUB KYC (decisione 2026-06-20): l'integrazione Didit reale arriva dopo (serve
// chiave + ok legale). Per ora segna l'utente come verificato sul profilo
// (profiles.kyc_status), cosi il flusso protetto puo' proseguire. Salva solo lo
// stato, MAI il dato biometrico del documento. Spec F2/A3.
export async function POST() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  // CRIT-4 (fail-closed): lo stub approva senza verificare NULLA. Deve esistere
  // solo in sviluppo. In produzione (o su Vercel) non risponde: il KYC reale
  // (Didit) e l'unica via. Senza questa guardia, un deploy senza env Didit
  // farebbe fail-open verso "approved", il campo che sblocca soldi e generazione.
  if (isProdLike()) {
    return NextResponse.json({ error: "Verifica di sviluppo non disponibile in produzione" }, { status: 410 });
  }
  reportDegradation("kyc.stub_used", { user: user.id });

  const admin = createServerClient();
  // CRIT-4: marca la verifica come 'stub' (di sviluppo) -> niente bonus VOLT.
  const { error } = await admin.from("profiles").update({ kyc_status: "approved", kyc_provider: "stub" }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await appendAudit({ actor: user.id, action: "kyc.stub_approved", target: user.id, meta: { provider: "stub" } });
  return NextResponse.json({ ok: true });
}
