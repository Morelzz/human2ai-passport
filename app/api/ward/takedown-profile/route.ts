import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { allowRequest } from "@/lib/rate-limit";
import { getProfile, upsertProfile } from "@/lib/ward/takedown-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Profilo del richiedente per le DMCA notice: nome, indirizzo, email. Si chiede una
// volta sola e si riusa. Dati personali solo lato server (RLS owner-only).

export async function GET() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });
  const profile = await getProfile(user.id);
  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const allowed = await allowRequest(`ward-takedown-profile:${user.id}`, 20, 60 * 60);
  if (!allowed) return NextResponse.json({ error: "Troppe richieste, riprova piu' tardi" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const fullName = String(body?.fullName ?? "").trim();
  const address = String(body?.address ?? "").trim();
  const email = String(body?.email ?? "").trim();
  if (!fullName || !address || !email || !email.includes("@")) {
    return NextResponse.json({ error: "Compila nome, indirizzo e una email valida" }, { status: 400 });
  }

  await upsertProfile(user.id, { fullName, address, email });
  return NextResponse.json({ ok: true, profile: { fullName, address, email } });
}
