import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { grantVolt } from "@/lib/volt";

// Accredito manuale VOLT — riservato agli operatori (role 'admin').
// POST: { email, amount, note? } -> accredita VOLT all'utente (reason 'admin_grant').
// È il ponte pre-Stripe: vendita via bonifico, accredito a mano, loop chiuso.

async function requireAdmin() {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato", status: 401 };
  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false as const, error: "Riservato agli operatori", status: 403 };
  return { ok: true as const };
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const amount = Math.floor(Number(body?.amount));
  const note = String(body?.note ?? "").trim().slice(0, 120);
  if (!email || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const admin = createServerClient();
  const { data: profile } = await admin.from("profiles").select("id, email").eq("email", email).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });

  const balance = await grantVolt(profile.id, amount, "admin_grant", note || "accredito manuale");
  if (balance === null) {
    return NextResponse.json({ error: "Sistema VOLT non configurato (applica supabase/volt.sql)" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, email: profile.email, accredited: amount, balance });
}
