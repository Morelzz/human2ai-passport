import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";

// Review D3 — salva una ricerca senza match come "avvisami": la domanda del
// buyer diventa domanda reale (attributi + categoria, mai dati personali di
// terzi). ADDITIVO: nessun flusso esistente toccato.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere per salvare l'avviso" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const attrs = body?.attrs && typeof body.attrs === "object" ? body.attrs : null;
  const category = body?.category ? String(body.category).trim() : null;
  if (!attrs && !category) {
    return NextResponse.json({ error: "Nessuna ricerca da salvare" }, { status: 400 });
  }

  const admin = createServerClient();
  const { error } = await admin.from("match_alerts").insert({
    buyer_id: user.id,
    attrs,
    category,
  });
  if (error) {
    // Tabella non ancora migrata o insert fallito: errore onesto, niente crash.
    console.warn("[match_alerts] insert fallito:", error.message);
    return NextResponse.json({ error: "Avvisi non ancora disponibili, riprova più tardi" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
