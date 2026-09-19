import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { eOperatore } from "@/lib/operatori";

// Messaggi del modulo /contatti per gli operatori (role 'admin'). Prima non li
// leggeva nessuno: restavano righe nel database. Le pagine legali mandano qui
// le richieste privacy e legali, quindi qualcuno deve vederle.
async function requireAdmin() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato", status: 401 };
  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (!eOperatore(profile?.role, user.email)) return { ok: false as const, error: "Riservato agli operatori", status: 403 };
  return { ok: true as const };
}

const STATI = ["open", "answered", "closed"] as const;
type Stato = (typeof STATI)[number];

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const stato = new URL(request.url).searchParams.get("stato");
  const admin = createServerClient();
  let q = admin.from("contact_messages").select("id, name, email, subject, message, status, created_at").order("created_at", { ascending: false }).limit(100);
  if (stato && (STATI as readonly string[]).includes(stato)) q = q.eq("status", stato);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "Messaggi non disponibili" }, { status: 503 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  const status = body?.status as Stato;
  if (!id || !STATI.includes(status)) return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  const admin = createServerClient();
  const { error } = await admin.from("contact_messages").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: "Aggiornamento non riuscito" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
