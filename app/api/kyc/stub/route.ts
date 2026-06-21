import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { appendAudit } from "@/lib/ward/audit";

export const runtime = "nodejs";

// STUB KYC (decisione 2026-06-20): l'integrazione Didit reale arriva dopo (serve
// chiave + ok legale). Per ora segna l'utente come verificato sul profilo
// (profiles.kyc_status), cosi il flusso protetto puo' proseguire. Salva solo lo
// stato, MAI il dato biometrico del documento. Spec F2/A3.
export async function POST() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const admin = createServerClient();
  const { error } = await admin.from("profiles").update({ kyc_status: "approved" }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await appendAudit({ actor: user.id, action: "kyc.stub_approved", target: user.id, meta: { provider: "stub" } });
  return NextResponse.json({ ok: true });
}
