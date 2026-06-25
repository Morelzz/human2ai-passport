import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { allowRequest, ipFrom } from "@/lib/rate-limit";

export const runtime = "nodejs";

// B4/B2 — richiesta commerciale dal form pubblico (/studio, /enterprise).
// Validazione + honeypot anti-bot; salva in business_inquiries (RLS chiusa).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  // Honeypot: se il campo invisibile è compilato è un bot → ok silenzioso.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  if (!(await allowRequest(`biz:${ipFrom(request)}`, 5, 600))) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra qualche minuto" }, { status: 429 });
  }

  const kind = body.kind === "enterprise" ? "enterprise" : body.kind === "studio" ? "studio" : null;
  if (!kind) return NextResponse.json({ error: "Canale non valido" }, { status: 400 });

  const company = String(body.company ?? "").trim().slice(0, 160);
  const name = String(body.name ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const budget = String(body.budget ?? "").trim().slice(0, 60);
  const message = String(body.message ?? "").trim().slice(0, 2000);

  if (company.length < 2) return NextResponse.json({ error: "Inserisci l'azienda" }, { status: 400 });
  if (name.length < 2) return NextResponse.json({ error: "Inserisci il tuo nome" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json({ error: "Raccontaci qualcosa in più sul progetto" }, { status: 400 });
  }

  const admin = createServerClient();
  const { error } = await admin.from("business_inquiries").insert({
    kind,
    company,
    name,
    email,
    budget: budget || null,
    message,
  });
  if (error) {
    return NextResponse.json({ error: "Richiesta non registrata: riprova tra poco" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
