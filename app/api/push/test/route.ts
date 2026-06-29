import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { sendPushToUser } from "@/lib/push/send";
import { buildTestPush } from "@/lib/push/payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/push/test — invia una notifica di prova all'utente loggato, subito
// dopo l'attivazione, cosi' vede coi propri occhi che gli avvisi funzionano.
export async function POST() {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const result = await sendPushToUser(user.id, buildTestPush());
  if (result.skipped) {
    return NextResponse.json({ error: "Push non configurato" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, sent: result.sent });
}
