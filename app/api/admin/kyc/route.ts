import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";

// Coda di revisione KYC — riservata agli operatori (role 'admin').
// GET:  profili con kyc_status='pending' + URL FIRMATI temporanei (10 min)
//       dei file nel bucket privato 'documents' (mai URL pubblici: sono
//       documenti d'identità).
// POST: { user_id, action: 'approve'|'reject' } -> aggiorna kyc_status.
// La revisione è MANUALE per scelta (fase attuale): il face-match automatico
// (AWS Rekognition / Stripe Identity) si innesterà sopra lo stesso campo.

const SIGNED_URL_TTL = 600; // secondi

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
  const { data: pending } = await admin
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("kyc_status", "pending")
    .order("created_at", { ascending: true });

  const items = [];
  for (const p of pending ?? []) {
    // I file della candidatura vivono in documents/<user_id>/
    const { data: files } = await admin.storage.from("documents").list(p.id);
    const names = (files ?? []).map((f) => `${p.id}/${f.name}`);
    let signed: { name: string; url: string }[] = [];
    if (names.length > 0) {
      const { data: urls } = await admin.storage.from("documents").createSignedUrls(names, SIGNED_URL_TTL);
      signed = (urls ?? [])
        .map((u, i) => ({ name: (files ?? [])[i]?.name ?? `file-${i}`, url: u.signedUrl }))
        .filter((x): x is { name: string; url: string } => Boolean(x.url));
    }
    items.push({ ...p, files: signed });
  }

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json().catch(() => null);
  const userId = String(body?.user_id ?? "").trim();
  const action = body?.action;
  if (!userId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const admin = createServerClient();
  const status = action === "approve" ? "approved" : "rejected";
  const { error } = await admin
    .from("profiles")
    .update({ kyc_status: status })
    .eq("id", userId)
    .eq("kyc_status", "pending"); // si decide solo ciò che è in attesa
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status });
}
