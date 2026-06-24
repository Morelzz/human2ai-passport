import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { verifyDiditWebhook, diditStatusToKyc } from "@/lib/kyc/didit";
import { appendAudit } from "@/lib/ward/audit";

export const runtime = "nodejs";

// Webhook Didit (pubblico, ma firmato): riceve gli aggiornamenti di stato della
// verifica. Verifica la firma + la freschezza, poi mappa lo stato su
// kyc_status del profilo correlato via vendor_data (= user.id). Dopo una firma
// valida risponde sempre 200, anche se l'utente non si trova: cosi' Didit non
// ritenta all'infinito (la coda resta pulita).
export async function POST(request: Request) {
  // Body GREZZO letto per primo: la firma raw va calcolata sui byte esatti, mai
  // su un JSON ri-serializzato.
  const rawBody = await request.text();
  const { ok, payload } = verifyDiditWebhook(rawBody, request.headers);
  if (!ok || !payload) {
    // Log solo sul fallimento (misconfig o tentativo), per debug della firma.
    console.warn("[didit-webhook] firma non valida", {
      hasV2: Boolean(request.headers.get("x-signature-v2")),
      hasRaw: Boolean(request.headers.get("x-signature")),
      len: rawBody.length,
    });
    return NextResponse.json({ error: "Firma non valida" }, { status: 401 });
  }

  // Per il KYC ci interessa solo lo stato della sessione. Gli altri tipi
  // (user./business./transaction./data.updated/activity.created) li accettiamo
  // e ignoriamo (2xx, cosi' Didit non ritenta).
  const type = payload.webhook_type ?? "status.updated";
  if (type !== "status.updated") {
    return NextResponse.json({ ok: true, ignored: type });
  }

  const userId = payload.vendor_data;
  const kyc = diditStatusToKyc(payload.status);
  if (userId && kyc) {
    // Idempotente: scrivere lo stesso kyc_status e' un no-op, quindi i retry di
    // Didit (stesso event_id) non causano effetti collaterali. Salviamo anche la
    // session: serve a ricavare il volto verificato (decisione Didit) quando la
    // persona carica le foto avatar/Ward, per il confronto identita'.
    const admin = createServerClient();
    await admin
      .from("profiles")
      // CRIT-4: la verifica e avvenuta via Didit (reale).
      .update({ kyc_status: kyc, kyc_provider: "didit", identity_session_id: payload.session_id })
      .eq("id", userId);
    await appendAudit({
      actor: userId,
      action: "kyc.didit_webhook",
      target: userId,
      meta: {
        provider: "didit",
        status: payload.status,
        kyc,
        session_id: payload.session_id,
        event_id: payload.event_id ?? null,
        environment: payload.environment ?? null,
      },
    });
  }
  // 2xx subito: il lavoro e' una singola update veloce, niente da differire.
  return NextResponse.json({ ok: true });
}
