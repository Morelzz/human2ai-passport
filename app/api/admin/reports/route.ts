import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";

// Coda di moderazione delle segnalazioni di abuso — solo operatori (role 'admin').
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
    .from("abuse_reports")
    .select("id, target_type, avatar_id, certificate, handle, reason, details, reporter_email, status, resolution, created_at, resolved_at")
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: true });

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await request.json().catch(() => null);
  const id = String(body?.report_id ?? "").trim();
  const action = body?.action;
  const resolution = typeof body?.resolution === "string" ? body.resolution.trim().slice(0, 2000) : "";
  // 'suspend' = accogli la segnalazione E sospendi l'avatar (rimozione prospettica dal registro).
  if (!id || (action !== "dismiss" && action !== "uphold" && action !== "suspend")) {
    return NextResponse.json({ error: "Parametri non validi" }, { status: 400 });
  }

  const admin = createServerClient();

  const { data: report } = await admin
    .from("abuse_reports")
    .select("id, avatar_id")
    .eq("id", id)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "Segnalazione non trovata" }, { status: 404 });

  // Se l'operatore sospende, rimuove l'avatar dal registro pubblico (gate verifica).
  let avatarSuspended = false;
  if (action === "suspend") {
    if (!report.avatar_id) {
      return NextResponse.json({ error: "Nessun avatar collegato a questa segnalazione" }, { status: 400 });
    }
    const { error: avErr } = await admin
      .from("avatars")
      .update({ verification_status: "rejected" })
      .eq("id", report.avatar_id);
    if (avErr) return NextResponse.json({ error: avErr.message }, { status: 500 });
    avatarSuspended = true;
  }

  const status = action === "dismiss" ? "dismissed" : "upheld";
  const { error } = await admin
    .from("abuse_reports")
    .update({ status, resolution: resolution || null, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status, avatarSuspended });
}
