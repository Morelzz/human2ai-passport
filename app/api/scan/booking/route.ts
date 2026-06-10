import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { SCAN_PRICE_CENTS } from "@/lib/scan";
import { isStripeConfigured, createScanCheckoutSession } from "@/lib/stripe";

// H2 — riceve la prenotazione della scansione in studio (form pubblico).
// Stati dal brief: nasce "richiesta"; la conferma di slot è manuale (admin)
// finché non c'è un'agenda reale. Pagamento: Stripe Checkout se configurato,
// altrimenti in studio (decisione Morelz 2026-06-10).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });

  // Honeypot anti-bot: fingiamo successo.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const sedeSlug = String(body.sede ?? "").trim();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim() || null;
  const date = String(body.date ?? "").trim();   // YYYY-MM-DD
  const time = String(body.time ?? "").trim();   // HH:00
  const notes = String(body.notes ?? "").trim() || null;

  if (!sedeSlug || !name || !email || !date || !time) {
    return NextResponse.json({ error: "Compila sede, nome, email, data e ora" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }
  const preferredAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(preferredAt.getTime()) || preferredAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Scegli una data e un'ora future" }, { status: 400 });
  }

  const admin = createServerClient();

  // Sede: deve esistere, essere attiva e prenotabile.
  const { data: sede, error: sedeErr } = await admin
    .from("sedi")
    .select("id, name, city, status, booking_enabled")
    .eq("slug", sedeSlug)
    .maybeSingle();
  if (sedeErr) {
    console.warn("[scan_bookings] sedi non disponibili:", sedeErr.message);
    return NextResponse.json({ error: "Prenotazioni non ancora disponibili, riprova più tardi" }, { status: 503 });
  }
  if (!sede || sede.status !== "attiva" || !sede.booking_enabled) {
    return NextResponse.json({ error: "Questa sede non è prenotabile al momento" }, { status: 400 });
  }

  const { data: booking, error } = await admin
    .from("scan_bookings")
    .insert({
      sede_id: sede.id,
      name,
      email,
      phone,
      preferred_at: preferredAt.toISOString(),
      notes,
      price_cents: SCAN_PRICE_CENTS,
    })
    .select("id")
    .single();
  if (error || !booking) {
    console.warn("[scan_bookings] insert fallito:", error?.message);
    return NextResponse.json({ error: "Prenotazioni non ancora disponibili, riprova più tardi" }, { status: 503 });
  }

  // Stripe (dormiente): se configurato si paga subito online.
  if (isStripeConfigured()) {
    const origin = new URL(request.url).origin;
    const session = await createScanCheckoutSession({
      bookingId: booking.id,
      email,
      priceCents: SCAN_PRICE_CENTS,
      sedeName: `${sede.name} · ${sede.city}`,
      origin,
    });
    if (session) {
      await admin.from("scan_bookings").update({ stripe_session_id: session.id }).eq("id", booking.id);
      return NextResponse.json({ ok: true, checkout_url: session.url });
    }
    // Checkout fallito: la prenotazione resta valida, si paga in studio.
  }

  return NextResponse.json({ ok: true });
}
