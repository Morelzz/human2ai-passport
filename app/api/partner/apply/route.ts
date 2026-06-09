import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// B1 — candidatura Capture Partner dal form pubblico /partner.
// Pubblica (i candidati non sono utenti registrati). Validazione + honeypot
// anti-bot; salva in partner_applications (service role, RLS chiusa).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  // Honeypot: campo invisibile agli umani; se compilato è un bot → ok silenzioso.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name ?? "").trim().slice(0, 120);
  const city = String(body.city ?? "").trim().slice(0, 80);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const portfolio = String(body.portfolio ?? "").trim().slice(0, 300);
  const message = String(body.message ?? "").trim().slice(0, 1000);

  if (name.length < 2) return NextResponse.json({ error: "Inserisci il tuo nome" }, { status: 400 });
  if (city.length < 2) return NextResponse.json({ error: "Inserisci la tua città" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }
  if (portfolio && !/^https?:\/\/\S+\.\S+/.test(portfolio)) {
    return NextResponse.json({ error: "Il portfolio deve essere un link (https://…)" }, { status: 400 });
  }

  const admin = createServerClient();
  const { error } = await admin.from("partner_applications").insert({
    name,
    city,
    email,
    portfolio_url: portfolio || null,
    message: message || null,
  });
  if (error) {
    return NextResponse.json({ error: "Candidatura non registrata: riprova tra poco" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
