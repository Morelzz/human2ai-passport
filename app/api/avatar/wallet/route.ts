import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";

// Collega un wallet self-custody (es. Phantom) all'avatar della persona.
// Quando si ancora l'identità soulbound, verrà mintata su QUESTO indirizzo.
// Non muove fondi, non firma transazioni: salva solo l'indirizzo dichiarato.
const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const wallet = String(body?.wallet ?? "").trim();
  const handle = body?.handle ? String(body.handle).trim() : null;
  if (!ADDR_RE.test(wallet)) {
    return NextResponse.json({ error: "Indirizzo wallet non valido" }, { status: 400 });
  }

  const admin = createServerClient();

  // Risolve l'avatar del proprietario (un seller ne ha uno; un'agenzia passa l'handle).
  let q = admin.from("avatars").select("id, handle, owner_id").eq("owner_id", user.id);
  if (handle) q = q.eq("handle", handle);
  const { data: av } = await q.maybeSingle();
  if (!av) return NextResponse.json({ error: "Avatar non trovato per questo account" }, { status: 404 });

  const { error } = await admin
    .from("avatars")
    .update({ owner_wallet: wallet.toLowerCase() })
    .eq("id", av.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, handle: av.handle, wallet: wallet.toLowerCase() });
}
