import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/push/key — chiave pubblica VAPID per iscriversi dal browser.
// E' pubblica per definizione (serve al client per cifrare); la privata resta
// solo lato server. Servita da route cosi' funziona anche senza esporre la
// NEXT_PUBLIC_ al bundle.
export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  if (!key) {
    return NextResponse.json({ error: "Push non configurato" }, { status: 503 });
  }
  return NextResponse.json({ key });
}
