import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { verifyDiditWebhook, diditStatusToKyc, getDiditDob } from "@/lib/kyc/didit";
import { kycAdultOutcome } from "@/lib/age";
import { reportDegradation } from "@/lib/observability";
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
    const admin = createServerClient();

    // Strato forte 18+: all'approvazione, leggiamo la data di nascita dal
    // documento e decidiamo. Non salviamo MAI la DOB documentale: solo l'esito.
    let finalKyc: "approved" | "rejected" | "pending" = kyc;
    const adultPatch: Record<string, unknown> = {};
    let underageBlocked = false;

    if (kyc === "approved") {
      const dob = await getDiditDob(payload.session_id);
      const outcome = kycAdultOutcome(dob, new Date());
      if (outcome === "under_18") {
        // Minore col documento: nessun volto di minore entra nel registro.
        finalKyc = "rejected";
        underageBlocked = true;
        console.error(`[SEMBLIC:SICUREZZA] kyc.underage_blocked user=${userId} session=${payload.session_id}`);
      } else if (outcome === "ok") {
        adultPatch.adult_verified_at = new Date().toISOString();
        adultPatch.adult_verified_method = "document";
      } else {
        // DOB illeggibile: niente stato document-adult, revisione manuale.
        reportDegradation("kyc.dob_missing", { user: userId, session: payload.session_id });
      }
    }

    await admin
      .from("profiles")
      .update({ kyc_status: finalKyc, kyc_provider: "didit", identity_session_id: payload.session_id, ...adultPatch })
      .eq("id", userId);

    await appendAudit({
      actor: userId,
      action: underageBlocked ? "kyc.underage_blocked" : "kyc.didit_webhook",
      target: userId,
      meta: {
        provider: "didit",
        status: payload.status,
        kyc: finalKyc,
        adult_method: adultPatch.adult_verified_method ?? null,
        session_id: payload.session_id,
        event_id: payload.event_id ?? null,
        environment: payload.environment ?? null,
      },
    });
  }
  // 2xx subito: il lavoro e' una singola update veloce, niente da differire.
  return NextResponse.json({ ok: true });
}
