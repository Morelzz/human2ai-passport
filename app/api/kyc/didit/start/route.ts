import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { createDiditSession, diditConfigured } from "@/lib/kyc/didit";

export const runtime = "nodejs";

// Avvia la verifica d'identita' Didit: crea una sessione (vendor_data = user.id),
// mette il profilo "in revisione" e ritorna l'URL ospitato da redirezionare.
// Lo stato definitivo (approved/rejected) lo decide il webhook firmato.
export async function POST() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });
  if (!diditConfigured()) {
    return NextResponse.json({ error: "Verifica automatica non ancora configurata" }, { status: 503 });
  }

  try {
    const { url } = await createDiditSession(user.id);
    // "In verifica" subito (feedback UX); il webhook portera' a approved/rejected.
    const admin = createServerClient();
    await admin.from("profiles").update({ kyc_status: "pending" }).eq("id", user.id);
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Avvio verifica non riuscito";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
