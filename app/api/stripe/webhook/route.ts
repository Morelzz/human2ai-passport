import { NextResponse } from "next/server";
import { verifyStripeSignature } from "@/lib/stripe-webhook";
import { grantVolt } from "@/lib/volt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/stripe/webhook — eventi Stripe. Unico evento che ci interessa:
// checkout.session.completed di una ricarica VOLT, su cui accreditiamo i VOLT.
// L'accredito e' idempotente (grant_volt deduplica su (user,type,ref) con
// ref = id sessione): un retry di Stripe non accredita due volte.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook non configurato" }, { status: 503 });

  // Serve il corpo GREZZO per verificare la firma.
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(payload, sig, secret)) {
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object ?? {};
    // Solo sessioni effettivamente pagate.
    if (session.payment_status === "paid") {
      const meta = (session.metadata ?? {}) as Record<string, string>;
      const userId = meta.user_id;
      const voltTotal = Math.floor(Number(meta.volt_total));
      const sessionId = String(session.id ?? "");
      if (userId && Number.isFinite(voltTotal) && voltTotal > 0 && sessionId) {
        // ref = id sessione: chiave d'idempotenza dell'accredito.
        await grantVolt(userId, voltTotal, "recharge", sessionId);
      }
    }
  }

  // Sempre 200 sugli eventi gestiti/ignorati: evita retry inutili di Stripe.
  return NextResponse.json({ received: true });
}
