import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { CONTENTS_SEEN_COOKIE } from "@/lib/contents-seen";

export const runtime = "nodejs";

// Segna "viste" le generazioni: salva un cookie con il timestamp dell'ultima
// visita a "I miei contenuti". Il badge "+N" nella nav conta le generazioni
// completate DOPO questo istante. Chiamata dalla pagina /account al montaggio.
export async function POST() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CONTENTS_SEEN_COOKIE, new Date().toISOString(), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 anno
    sameSite: "lax",
  });
  return res;
}
