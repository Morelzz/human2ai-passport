import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Riceve i report di violazione CSP (Report-Only). Logga solo i campi utili,
// MAI dati sensibili. Serve a capire cosa rompe prima di passare a enforce.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const r = body?.["csp-report"] ?? body ?? {};
    console.warn("[csp]", JSON.stringify({
      violated: r["violated-directive"] ?? r.violatedDirective,
      blocked: r["blocked-uri"] ?? r.blockedURI,
      doc: r["document-uri"] ?? r.documentURI,
    }));
  } catch {
    // best-effort: una violazione non deve mai rompere nulla
  }
  return NextResponse.json({ ok: true });
}
