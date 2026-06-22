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
    .select("id, handle, alias, gender, age_range, ethnicity, hair_color, created_at, org_id, owner_id, person_consented_at, identity_match")
    .eq("verification_status", "pending_review")
    .order("created_at", { ascending: true });

  const rows = data ?? [];
  const TTL = 600; // URL firmati a vita breve: l'operatore guarda, non scarica.
  async function sign(bucket: string, path: string): Promise<string | null> {
    try {
      const { data: s } = await admin.storage.from(bucket).createSignedUrl(path, TTL);
      return s?.signedUrl ?? null;
    } catch { return null; }
  }
  async function firstPhoto(handle: string | null): Promise<string | null> {
    if (!handle) return null;
    try {
      const { data: list } = await admin.storage.from("references").list(handle);
      const f = (list ?? []).find((x) => /\.(jpe?g|png|webp)$/i.test(x.name));
      return f ? sign("references", `${handle}/${f.name}`) : null;
    } catch { return null; }
  }

  // Miniature firmate (documento + selfie dal bucket privato 'documents', prima
  // foto dell'avatar da 'references') per assistere la certificazione manuale.
  const items = await Promise.all(rows.map(async (a) => {
    const [doc_url, selfie_url, photo_url] = await Promise.all([
      a.owner_id ? sign("documents", `${a.owner_id}/avatar/document-front.jpg`) : null,
      a.owner_id ? sign("documents", `${a.owner_id}/avatar/selfie.jpg`) : null,
      firstPhoto(a.handle),
    ]);
    return { ...a, doc_url, selfie_url, photo_url };
  }));

  return NextResponse.json({ items });
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

  // Solo gli avatar onboardati da un'ORGANIZZAZIONE (org_id) richiedono il consenso
  // separato della persona prima dell'approvazione. Il privato ha creato e firmato
  // lui stesso il proprio avatar: il consenso è implicito, qui conta la certificazione
  // del volto (documento = selfie = foto) che l'operatore valuta a mano.
  if (action === "approve") {
    const { data: av } = await admin.from("avatars").select("org_id, person_consented_at").eq("id", avatarId).maybeSingle();
    if (av?.org_id && !av.person_consented_at) {
      return NextResponse.json({ error: "La persona non ha ancora confermato il consenso" }, { status: 400 });
    }
  }

  const status = action === "approve" ? "approved" : "rejected";
  const { error } = await admin.from("avatars").update({ verification_status: status }).eq("id", avatarId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status });
}
