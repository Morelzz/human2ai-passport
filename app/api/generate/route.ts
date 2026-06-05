import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { ROYALTY_PER_GEN_CENTS } from "@/lib/wallet";

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const handle = String(body?.handle ?? "").trim();
  const prompt = String(body?.prompt ?? "").trim();
  if (!handle) return NextResponse.json({ error: "Avatar mancante" }, { status: 400 });

  const admin = createServerClient();

  // Rivalida: l'avatar esiste, è SOUL e ha consenso attivo
  const { data: avatar } = await admin
    .from("avatars")
    .select("id, alias, tier, revoked_at, usage_count, royalty_accrued_cents")
    .eq("handle", handle)
    .maybeSingle();

  if (!avatar) return NextResponse.json({ error: "Avatar inesistente" }, { status: 404 });
  if (avatar.revoked_at) return NextResponse.json({ error: "Consenso revocato: generazione bloccata" }, { status: 403 });
  if (avatar.tier !== "SOUL") return NextResponse.json({ error: "Solo avatar SOUL sono generabili in questa fase" }, { status: 403 });

  // Credenziale d'uscita: hash anonimo (nessun dato biometrico) — seme del C2PA
  const genId = crypto.randomUUID();
  const certificate = crypto
    .createHash("sha256")
    .update(`${avatar.id}|${genId}|${prompt}|${new Date().toISOString().slice(0, 10)}`)
    .digest("hex");

  // Registra la generazione
  await admin.from("generations").insert({
    id: genId,
    avatar_id: avatar.id,
    buyer_id: user.id,
    prompt,
    royalty_cents: ROYALTY_PER_GEN_CENTS,
    certificate,
  });

  // Accredita royalty + incrementa utilizzi (accumulo, non payout)
  await admin
    .from("avatars")
    .update({
      usage_count: (avatar.usage_count ?? 0) + 1,
      royalty_accrued_cents: (avatar.royalty_accrued_cents ?? 0) + ROYALTY_PER_GEN_CENTS,
    })
    .eq("id", avatar.id);

  return NextResponse.json({
    ok: true,
    certificate,
    royalty_cents: ROYALTY_PER_GEN_CENTS,
    alias: avatar.alias,
  });
}
