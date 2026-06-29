import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createVoltCheckoutSession } from "@/lib/stripe";
import { VOLT_PACKS } from "@/lib/volt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/volt/checkout { packId } — avvia il pagamento di un pacchetto VOLT.
// Ritorna l'URL di Stripe Checkout; l'accredito avviene via webhook a pagamento
// confermato, mai qui.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const packId = String(body?.packId ?? "").trim();
  const pack = VOLT_PACKS.find((p) => p.id === packId);
  if (!pack) return NextResponse.json({ error: "Pacchetto non valido" }, { status: 400 });

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const session = await createVoltCheckoutSession({
    userId: user.id,
    email: user.email ?? "",
    packId: pack.id,
    packName: pack.name,
    voltTotal: pack.volt + pack.bonus,
    priceCents: pack.priceCents,
    origin,
  });

  if (!session) {
    // Stripe non configurato o errore: il pagamento online non e' disponibile.
    return NextResponse.json({ error: "Pagamento non disponibile" }, { status: 503 });
  }
  return NextResponse.json({ url: session.url });
}
