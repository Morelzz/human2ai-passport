import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { saveSubscription, type WebPushSubscription } from "@/lib/push/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/push/subscribe { subscription } — registra il dispositivo loggato
// per ricevere gli avvisi Ward.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const sub = body?.subscription as WebPushSubscription | undefined;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "Subscription non valida" }, { status: 400 });
  }

  try {
    await saveSubscription(user.id, sub, request.headers.get("user-agent") ?? undefined);
  } catch {
    return NextResponse.json({ error: "Salvataggio fallito" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
