import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { allowRequest } from "@/lib/rate-limit";
import { adultGateReason, type AdultGateState } from "@/lib/adult-gate";
import { avatarVetoReason } from "@/lib/avatar-gate";
import { logBlockedRequest } from "@/lib/blocked";
import { spendVolt, grantVolt } from "@/lib/volt";
import { animaConfigurata, inviaVideo, isDurata, movimentoVietato, prezzoAnima, MOVIMENTI } from "@/lib/engines/anima";

export const runtime = "nodejs";

// ANIMA: uno scatto certificato del buyer diventa un video breve (Seedance 2.5).
// Controlli nello stesso ordine di /api/generate, piu' uno: il consenso AL VIDEO
// della persona. L'invio al motore e' veloce (torna un request id): il video lo
// segue /api/anima/[id], che a fine lavoro lo copia da noi e lo certifica.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });
  if (!(await allowRequest(`anima:${user.id}`, 4, 60))) {
    return NextResponse.json({ error: "Troppe richieste, attendi un momento" }, { status: 429 });
  }
  if (!animaConfigurata()) return NextResponse.json({ error: "Anima non è ancora attiva" }, { status: 503 });

  const body = await request.json().catch(() => null);
  const certificate = String(body?.certificate ?? "").trim();
  const movimento = String(body?.movimento ?? "").trim();
  const secondi = Number(body?.secondi);
  if (!certificate) return NextResponse.json({ error: "Scatto mancante" }, { status: 400 });
  if (!isDurata(secondi)) return NextResponse.json({ error: "Durata non valida" }, { status: 400 });
  const pronto = MOVIMENTI.some((m) => m.v === movimento);
  if (!pronto && (movimento.length < 4 || movimento.length > 400)) {
    return NextResponse.json({ error: "Descrivi il movimento in poche parole" }, { status: 400 });
  }
  if (!pronto && movimentoVietato(movimento)) {
    return NextResponse.json({ error: "Questo movimento non si può chiedere: il volto è di una persona reale." }, { status: 422 });
  }

  const admin = createServerClient();

  // 18+ come per le foto.
  const { data: profilo } = await admin.from("profiles").select("date_of_birth, adult_verified_at").eq("id", user.id).maybeSingle();
  const eta = adultGateReason(profilo as AdultGateState | null, new Date());
  if (eta) {
    return eta === "no_dob"
      ? NextResponse.json({ error: "Conferma la tua data di nascita per continuare.", code: "age_unverified" }, { status: 403 })
      : NextResponse.json({ error: "SEMBLIC è riservato ai maggiorenni." }, { status: 403 });
  }

  // Lo scatto deve essere del buyer, commerciale e certificato.
  const { data: gen } = await admin
    .from("generations")
    .select("id, avatar_id, image_url, buyer_id, mode")
    .eq("certificate", certificate)
    .maybeSingle();
  if (!gen || gen.buyer_id !== user.id || gen.mode !== "commercial" || !gen.image_url) {
    return NextResponse.json({ error: "Scatto non trovato tra i tuoi" }, { status: 404 });
  }

  // La persona: niente veto, consenso commerciale e consenso al video.
  const { data: avatar } = await admin
    .from("avatars")
    .select("id, alias, revoked_at, protection_only, commercial_consent, video_consent")
    .eq("id", gen.avatar_id)
    .maybeSingle();
  if (!avatar) return NextResponse.json({ error: "Volto inesistente" }, { status: 404 });
  const veto = avatarVetoReason(avatar);
  if (veto || avatar.commercial_consent === false) {
    logBlockedRequest(admin, { source: "anima", reason: veto ?? "no_commercial_consent", category: null });
    return NextResponse.json({ error: "Questo volto non è più disponibile." }, { status: 403 });
  }
  if (avatar.video_consent !== true) {
    logBlockedRequest(admin, { source: "anima", reason: "no_video_consent", category: null });
    return NextResponse.json({ error: `${avatar.alias} non ha ancora dato il consenso al video.`, code: "no_video_consent" }, { status: 403 });
  }

  const prezzo = prezzoAnima(secondi);
  const id = crypto.randomUUID();
  const spesa = await spendVolt(user.id, prezzo.gross_cents, `ANIMA:${id}`);
  if (!spesa.ok && spesa.reason === "insufficient") {
    return NextResponse.json(
      { error: "Saldo VOLT insufficiente", volt: { needed: prezzo.gross_cents, balance: spesa.balance ?? 0, missing: prezzo.gross_cents - (spesa.balance ?? 0) } },
      { status: 402 },
    );
  }

  let requestId: string;
  try {
    ({ requestId } = await inviaVideo(gen.image_url, movimento, secondi));
  } catch (e) {
    if (spesa.ok) await grantVolt(user.id, prezzo.gross_cents, "refund", `anima:${id}`);
    console.error("[ANIMA] invio fallito", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Il motore video non ha accettato la richiesta. Non ti abbiamo addebitato nulla.", volt_refunded: spesa.ok ? prezzo.gross_cents : undefined }, { status: 502 });
  }

  const { error: insErr } = await admin.from("animations").insert({
    id,
    buyer_id: user.id,
    avatar_id: avatar.id,
    source_generation_id: gen.id,
    provider_request_id: requestId,
    movement: movimento,
    seconds: secondi,
    ...prezzo,
  });
  if (insErr) {
    console.error("[ANIMA] registrazione fallita", insErr.message);
    if (spesa.ok) await grantVolt(user.id, prezzo.gross_cents, "refund", `anima:${id}`);
    return NextResponse.json({ error: "Non riesco a registrare il video. Non ti abbiamo addebitato nulla." }, { status: 503 });
  }

  return NextResponse.json({
    id,
    alias: avatar.alias,
    gross_cents: prezzo.gross_cents,
    royalty_cents: prezzo.royalty_cents,
    volt: spesa.ok ? { spent: prezzo.gross_cents, balance: spesa.balance } : undefined,
  });
}
