import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { listSoulIds } from "@/lib/higgsfield";

// Elenca i Soul ID dell'account Higgsfield, per collegarli agli avatar.
// Riservato a creatori/admin autenticati. Le credenziali stanno solo lato server.
export async function GET() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { data: profile } = await auth
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "seller" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  try {
    const items = await listSoulIds();
    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore Higgsfield";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
