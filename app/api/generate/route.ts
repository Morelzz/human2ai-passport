import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { grossForCategory, splitRoyalty } from "@/lib/wallet";
import { generateWithHiggsfield, buildGenerationPrompt } from "@/lib/higgsfield";
import { DEFAULT_MODEL, isValidModel, isValidStyle } from "@/lib/soul-models";

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const handle = String(body?.handle ?? "").trim();
  // "scene" = direzione artistica libera (azione, ambientazione, luce, stile).
  // Va al motore: l'identità è garantita dal Soul, NON dalle parole del prompt.
  // Retro-compatibilità: accetta anche il vecchio campo "prompt".
  const scene = String(body?.scene ?? body?.prompt ?? "").trim();
  const category = body?.category ? String(body.category).trim() : null;
  // Modello di generazione (default Soul 2.0) e stile (solo Soul ID).
  const model = isValidModel(body?.model) ? body.model : DEFAULT_MODEL;
  const styleId = body?.styleId && isValidStyle(String(body.styleId)) ? String(body.styleId) : null;
  if (!handle) return NextResponse.json({ error: "Avatar mancante" }, { status: 400 });

  const admin = createServerClient();

  // Rivalida: l'avatar esiste, è SOUL, ha consenso attivo e copre la categoria d'uso.
  const { data: avatar } = await admin
    .from("avatars")
    .select("id, alias, tier, revoked_at, usage_count, royalty_accrued_cents, soul_ref, approved_categories, excluded_categories")
    .eq("handle", handle)
    .maybeSingle();

  if (!avatar) return NextResponse.json({ error: "Avatar inesistente" }, { status: 404 });
  if (avatar.revoked_at) return NextResponse.json({ error: "Consenso revocato: generazione bloccata" }, { status: 403 });
  if (avatar.tier !== "SOUL") return NextResponse.json({ error: "Solo avatar SOUL sono generabili in questa fase" }, { status: 403 });

  // Guardrail consenso: se è indicata una categoria d'uso, deve essere autorizzata.
  if (category) {
    if (avatar.excluded_categories?.includes(category)) {
      return NextResponse.json({ error: `"${avatar.alias}" ha escluso la categoria ${category}` }, { status: 403 });
    }
    if (avatar.approved_categories && !avatar.approved_categories.includes(category)) {
      return NextResponse.json({ error: `"${avatar.alias}" non ha autorizzato la categoria ${category}` }, { status: 403 });
    }
  }

  // Bridge verso il motore (Higgsfield Soul) — terza parte invisibile, solo lato server.
  // Il prompt inviato è SOLO la scena: l'identità arriva dal Soul (custom_reference_id).
  let engineResult;
  try {
    engineResult = await generateWithHiggsfield({
      avatarId: avatar.id,
      soulRef: avatar.soul_ref ?? null,
      prompt: buildGenerationPrompt(scene),
      model,
      styleId: model === "soul-id" ? styleId : null,
    });
  } catch {
    return NextResponse.json({ error: "Generazione non riuscita sul motore" }, { status: 502 });
  }
  if (engineResult.status !== "completed") {
    return NextResponse.json({ error: "Generazione non riuscita sul motore" }, { status: 502 });
  }

  // Economia: prezzo lordo per categoria, diviso in fee piattaforma + netto avatar.
  const gross = grossForCategory(category);
  const { gross_cents, fee_cents, net_cents } = splitRoyalty(gross);

  // Credenziale d'uscita: hash anonimo (nessun dato biometrico) — seme del C2PA.
  const genId = crypto.randomUUID();
  const certificate = crypto
    .createHash("sha256")
    .update(`${avatar.id}|${genId}|${scene}|${new Date().toISOString().slice(0, 10)}`)
    .digest("hex");

  // Registra la generazione con il dettaglio economico.
  await admin.from("generations").insert({
    id: genId,
    avatar_id: avatar.id,
    buyer_id: user.id,
    prompt: scene,
    category,
    gross_cents,
    fee_cents,
    royalty_cents: net_cents, // netto accreditato all'avatar
    certificate,
    image_url: engineResult.imageUrl,
    engine_ref: engineResult.generationRef,
  });

  // Accredita la royalty NETTA + incrementa utilizzi (accumulo, non payout).
  await admin
    .from("avatars")
    .update({
      usage_count: (avatar.usage_count ?? 0) + 1,
      royalty_accrued_cents: (avatar.royalty_accrued_cents ?? 0) + net_cents,
    })
    .eq("id", avatar.id);

  return NextResponse.json({
    ok: true,
    certificate,
    alias: avatar.alias,
    image_url: engineResult.imageUrl,
    category,
    gross_cents,
    fee_cents,
    royalty_cents: net_cents,
  });
}
