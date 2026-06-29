import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { deleteSubscription } from "@/lib/push/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/push/unsubscribe { endpoint } — l'utente disattiva gli avvisi su
// questo dispositivo.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint = String(body?.endpoint ?? "").trim();
  if (!endpoint) return NextResponse.json({ error: "endpoint mancante" }, { status: 400 });

  try {
    await deleteSubscription(endpoint);
  } catch {
    return NextResponse.json({ error: "Rimozione fallita" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
