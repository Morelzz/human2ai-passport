import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { createDiditSession, diditConfigured, safeInternalPath } from "@/lib/kyc/didit";

export const runtime = "nodejs";

// Avvia la verifica d'identita' Didit: crea una sessione (vendor_data = user.id),
// mette il profilo "in revisione" e ritorna l'URL ospitato da redirezionare.
// Lo stato definitivo (approved/rejected) lo decide il webhook firmato.
// Body opzionale { returnTo }: path interno dove tornare dopo Didit (il funnel
// protetto lo usa per riprendere; default = /account/verify).
export async function POST(req: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });
  if (!diditConfigured()) {
    return NextResponse.json({ error: "Verifica automatica non ancora configurata" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const returnTo = safeInternalPath(body?.returnTo, "/account/verify?didit=done");

  try {
    const { url } = await createDiditSession(user.id, returnTo);
    // "In verifica" subito (feedback UX); il webhook portera' a approved/rejected.
    const admin = createServerClient();
    await admin.from("profiles").update({ kyc_status: "pending" }).eq("id", user.id);
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Avvio verifica non riuscito";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
