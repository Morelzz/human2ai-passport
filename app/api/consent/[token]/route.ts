import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// La PERSONA conferma il proprio consenso aprendo il link tokenizzato.
// Pubblico (il token è il segreto). Registra person_consented_at + evento.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await request.json().catch(() => null);
  const signature = String(body?.signature ?? "").trim();
  if (signature.length < 2) {
    return NextResponse.json({ error: "Firma con il tuo nome per confermare" }, { status: 400 });
  }

  const admin = createServerClient();
  const { data: avatar } = await admin
    .from("avatars")
    .select("id, person_consented_at")
    .eq("consent_token", token)
    .maybeSingle();

  if (!avatar) return NextResponse.json({ error: "Link non valido o scaduto" }, { status: 404 });
  if (avatar.person_consented_at) {
    return NextResponse.json({ error: "Consenso già confermato" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { error: updErr } = await admin
    .from("avatars")
    .update({ person_consented_at: now })
    .eq("id", avatar.id);
  if (updErr) return NextResponse.json({ error: "Conferma non riuscita" }, { status: 500 });

  await admin.from("consent_events").insert({
    avatar_id: avatar.id,
    event_type: "GRANTED",
    detail: `Consenso confermato dalla persona (firma: ${signature})`,
    occurred_at: now.slice(0, 10),
  });

  return NextResponse.json({ ok: true });
}
