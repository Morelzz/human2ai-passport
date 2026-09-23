import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { voltoDelTitolare, handlePulito } from "@/lib/volto-del-titolare";

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
  const handle = handlePulito(body?.handle);
  if (!ADDR_RE.test(wallet)) {
    return NextResponse.json({ error: "Indirizzo wallet non valido" }, { status: 400 });
  }

  const admin = createServerClient();

  // Il volto del titolare: quello dell'handle se e' suo, altrimenti quello che conta.
  const av = await voltoDelTitolare<{ id: string }>(admin, user.id, "id", { handle });
  if (!av) return NextResponse.json({ error: "Avatar non trovato per questo account" }, { status: 404 });

  const { error } = await admin
    .from("avatars")
    .update({ owner_wallet: wallet.toLowerCase() })
    .eq("id", av.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, handle: av.handle, wallet: wallet.toLowerCase() });
}
