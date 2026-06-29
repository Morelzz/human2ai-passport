// H2 — Stripe Checkout per il servizio di scansione, in modalità "dormiente"
// (stesso pattern di lib/chain.ts): senza STRIPE_SECRET_KEY tutto è no-op e
// il booking funziona comunque (pagamento in studio). Quando Morelz crea
// l'account Stripe basta mettere la chiave in env: nessun deploy di codice.
// Niente SDK: una chiamata REST form-encoded, zero dipendenze nuove.

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export async function createScanCheckoutSession(opts: {
  bookingId: string;
  email: string;
  priceCents: number;
  sedeName: string;
  origin: string;
}): Promise<CheckoutSession | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][product_data][name]": `Scansione SEMBLIC-SCAN · ${opts.sedeName}`,
    "line_items[0][price_data][unit_amount]": String(opts.priceCents),
    "line_items[0][quantity]": "1",
    customer_email: opts.email,
    success_url: `${opts.origin}/scansione/prenota?esito=ok`,
    cancel_url: `${opts.origin}/scansione/prenota?esito=annullato`,
    "metadata[booking_id]": opts.bookingId,
  });

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    if (!res.ok) {
      console.warn("[stripe] creazione checkout fallita:", await res.text());
      return null;
    }
    const json = (await res.json()) as { id?: string; url?: string };
    return json.id && json.url ? { id: json.id, url: json.url } : null;
  } catch (e) {
    console.warn("[stripe] errore di rete:", e);
    return null;
  }
}

// Checkout per un pacchetto VOLT. price_data inline (nessun prodotto Stripe
// pre-creato richiesto): il prezzo arriva dai VOLT_PACKS, la quantita' di VOLT
// da accreditare viaggia nei metadata. L'accredito vero avviene SOLO via webhook
// (checkout.session.completed), mai sul success_url.
export async function createVoltCheckoutSession(opts: {
  userId: string;
  email: string;
  packId: string;
  packName: string;
  voltTotal: number; // volt base + bonus, gia' sommati
  priceCents: number;
  origin: string;
}): Promise<CheckoutSession | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][product_data][name]": `Ricarica VOLT ${opts.packName} (${opts.voltTotal} VOLT)`,
    "line_items[0][price_data][unit_amount]": String(opts.priceCents),
    "line_items[0][quantity]": "1",
    customer_email: opts.email,
    success_url: `${opts.origin}/account/volt?esito=ok`,
    cancel_url: `${opts.origin}/account/volt?esito=annullato`,
    "metadata[user_id]": opts.userId,
    "metadata[volt_total]": String(opts.voltTotal),
    "metadata[pack_id]": opts.packId,
  });

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    if (!res.ok) {
      console.warn("[stripe] checkout VOLT fallito:", await res.text());
      return null;
    }
    const json = (await res.json()) as { id?: string; url?: string };
    return json.id && json.url ? { id: json.id, url: json.url } : null;
  } catch (e) {
    console.warn("[stripe] errore di rete (VOLT):", e);
    return null;
  }
}
