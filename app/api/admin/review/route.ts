import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";

// Coda di revisione manuale degli operatori (Enterprise).
// Solo gli account 'admin' (operatori) possono vedere e decidere.
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
    .from("avatars")
    .select("id, handle, alias, gender, age_range, ethnicity, hair_color, created_at, org_id, person_consented_at")
    .eq("verification_status", "pending_review")
    .order("created_at", { ascending: true });

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json().catch(() => null);
  const avatarId = String(body?.avatar_id ?? "").trim();
  const action = body?.action;
  if (!avatarId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const admin = createServerClient();

  // Non si può approvare un avatar senza il consenso confermato dalla persona.
  if (action === "approve") {
    const { data: av } = await admin.from("avatars").select("person_consented_at").eq("id", avatarId).maybeSingle();
    if (!av?.person_consented_at) {
      return NextResponse.json({ error: "La persona non ha ancora confermato il consenso" }, { status: 400 });
    }
  }

  const status = action === "approve" ? "approved" : "rejected";
  const { error } = await admin.from("avatars").update({ verification_status: status }).eq("id", avatarId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status });
}
