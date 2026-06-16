import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";

// Coda di revisione KYB (aziende) — riservata agli operatori (role 'admin').
// GET:  organizzazioni con kyb_status='pending' (dati azienda per la verifica).
// POST: { org_id, action:'approve'|'reject', reason? } -> aggiorna kyb_status.
// KYB MANUALE per scelta (come il KYC individuale): l'operatore verifica P.IVA,
// ragione sociale e sito prima di sbloccare l'onboarding del roster.
async function requireAdmin() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { ok: false as const, error: "Non autenticato", status: 401 };
  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false as const, error: "Riservato agli operatori", status: 403 };
  return { ok: true as const };
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createServerClient();
  const { data } = await admin
    .from("organizations")
    .select("id, name, vat_number, country, website, contact_email, kyb_submitted_at, created_at")
    .eq("kyb_status", "pending")
    .order("created_at", { ascending: true })
    .limit(100); // guardia: oltre, servirà la paginazione (follow-up)

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json().catch(() => null);
  const orgId = String(body?.org_id ?? "").trim();
  const action = body?.action;
  const reason = String(body?.reason ?? "").trim().slice(0, 300) || null;
  if (!orgId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const admin = createServerClient();
  const status = action === "approve" ? "approved" : "rejected";
  const { data: changed, error } = await admin
    .from("organizations")
    .update({
      kyb_status: status,
      reviewed_at: new Date().toISOString(),
      rejected_reason: action === "reject" ? reason : null,
    })
    .eq("id", orgId)
    .eq("kyb_status", "pending") // si decide solo ciò che è in attesa
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // 0 righe = un altro operatore l'ha già decisa (coda condivisa).
  if (!changed || changed.length === 0) {
    return NextResponse.json({ error: "Questa azienda è già stata decisa da un altro operatore (ricarica la coda)." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, status });
}
