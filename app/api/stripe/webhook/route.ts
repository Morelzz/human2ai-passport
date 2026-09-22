import { NextResponse } from "next/server";
import { verifyStripeSignature } from "@/lib/stripe-webhook";
import { grantVolt } from "@/lib/volt";
import { premiaRicarica } from "@/lib/invito-server";

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

  let event: { type?: string; livemode?: boolean; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  // Difesa in profondita': con le chiavi di prova un pagamento con la carta finta
  // accrediterebbe VOLT veri. Si accreditano solo gli eventi reali (livemode),
  // salvo la leva interna STRIPE_CONSENTI_TEST=1 per le nostre prove.
  if (event.livemode !== true && process.env.STRIPE_CONSENTI_TEST !== "1") {
    console.warn("[stripe] evento non reale ignorato:", event.type);
    return NextResponse.json({ received: true, ignorato: "non livemode" });
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
        // Se questo account e' arrivato da un invito, adesso si paga chi l'ha
        // portato (e, la prima volta, anche lui). Mai a fondo perduto: solo su
        // una ricarica vera. Se qualcosa non va, la ricarica resta buona.
        await premiaRicarica(userId, voltTotal, sessionId).catch((e) =>
          console.error("[invito] premio non accreditato:", e instanceof Error ? e.message : e),
        );
      }
    }
  }

  // Sempre 200 sugli eventi gestiti/ignorati: evita retry inutili di Stripe.
  return NextResponse.json({ received: true });
}
