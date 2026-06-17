import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";

// B3 fase "ora": flag opt-in del seller "disponibile per ingaggi reali".
// Solo segnale (il brand contatta via /contatti). Non muove nulla d'altro.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const available = Boolean(body?.available);
  const handle = body?.handle ? String(body.handle).trim() : null;

  const admin = createServerClient();
  // Risolve l'avatar del proprietario (un seller ne ha uno; un'agenzia passa l'handle).
  let q = admin.from("avatars").select("id, handle, protection_only").eq("owner_id", user.id);
  if (handle) q = q.eq("handle", handle);
  const { data: av } = await q.maybeSingle();
  if (!av) return NextResponse.json({ error: "Avatar non trovato per questo account" }, { status: 404 });
  // Un volto in sola protezione (VETO) non puo' offrirsi per ingaggi.
  if (av.protection_only) return NextResponse.json({ error: "Un volto protetto non puo' offrirsi per ingaggi" }, { status: 400 });

  const { error } = await admin
    .from("avatars")
    .update({ available_for_booking: available })
    .eq("id", av.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, handle: av.handle, available_for_booking: available });
}
