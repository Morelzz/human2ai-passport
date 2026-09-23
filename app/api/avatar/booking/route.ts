import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { voltoDelTitolare, handlePulito } from "@/lib/volto-del-titolare";

// B3 fase "ora": flag opt-in del seller "disponibile per ingaggi reali".
// Solo segnale (il brand contatta via /contatti). Non muove nulla d'altro.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const available = Boolean(body?.available);
  const handle = handlePulito(body?.handle);

  const admin = createServerClient();
  // Il volto del titolare: quello dell'handle se e' suo, altrimenti quello che conta.
  const av = await voltoDelTitolare<{ id: string }>(admin, user.id, "id", { handle });
  if (!av) return NextResponse.json({ error: "Avatar non trovato per questo account" }, { status: 404 });
  // Un volto in sola protezione (VETO) non puo' offrirsi per ingaggi.
  if (av.protection_only) return NextResponse.json({ error: "Un volto protetto non può offrirsi per ingaggi" }, { status: 400 });

  const { error } = await admin
    .from("avatars")
    .update({ available_for_booking: available })
    .eq("id", av.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, handle: av.handle, available_for_booking: available });
}
