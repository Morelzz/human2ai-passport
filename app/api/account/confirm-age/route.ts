// app/api/account/confirm-age/route.ts
// Prompt una-tantum per gli account nati prima del gate: l'utente conferma la
// data di nascita. Validazione autoritativa lato server (fail-closed).
import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { isAdult } from "@/lib/age";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const dob = String(body?.date_of_birth ?? "").trim(); // atteso "YYYY-MM-DD"

  if (!isAdult(dob, new Date())) {
    return NextResponse.json({ error: "Per usare SEMBLIC devi avere almeno 18 anni." }, { status: 403 });
  }

  const admin = createServerClient();
  await admin
    .from("profiles")
    .update({ date_of_birth: dob, adult_verified_at: new Date().toISOString(), adult_verified_method: "self" })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
