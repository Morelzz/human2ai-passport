import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// F2 — riceve i messaggi del form /contatti (pubblico, niente account).
// Honeypot anti-bot come negli altri form; salvataggio su contact_messages.
// La "notifica" oggi è la riga su Supabase: l'email di avviso arriverà
// quando sceglieremo un provider di posta transazionale.

const SUBJECTS = ["Sono un brand", "Voglio mettere il mio volto", "Stampa", "Partner", "Legale", "Altro"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });

  // Honeypot: i bot compilano il campo invisibile → fingiamo successo.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Nome, email e messaggio sono obbligatori" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }
  if (!SUBJECTS.includes(subject)) {
    return NextResponse.json({ error: "Scegli un oggetto dal menu" }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "Messaggio troppo lungo (max 4000 caratteri)" }, { status: 400 });
  }

  const admin = createServerClient();
  const { error } = await admin.from("contact_messages").insert({ name, email, subject, message });
  if (error) {
    console.warn("[contact_messages] insert fallito:", error.message);
    return NextResponse.json({ error: "Invio non disponibile al momento, riprova più tardi" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
