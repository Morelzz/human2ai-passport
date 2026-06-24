import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { PAYOUT_THRESHOLD_CENTS, payoutProviderConfigured } from "@/lib/wallet";

// Payout SIMULATO (Stripe Connect arriverà qui). Azzera l'accumulo a soglia raggiunta.
export async function POST() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const admin = createServerClient();
  const { data: avatar } = await admin
    .from("avatars")
    .select("id, royalty_accrued_cents")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!avatar) return NextResponse.json({ error: "Nessun avatar" }, { status: 404 });

  const accrued = avatar.royalty_accrued_cents ?? 0;
  if (accrued < PAYOUT_THRESHOLD_CENTS) {
    return NextResponse.json({ error: "Soglia di payout non raggiunta" }, { status: 400 });
  }

  // A1 (fail-closed): finche non c'e un provider di payout REALE non registriamo
  // un pagamento finto e soprattutto NON azzeriamo le royalty maturate. Azzerare
  // senza pagare distruggerebbe un credito dovuto alla persona, senza modo di
  // ricostruirlo. Il saldo resta intatto fino a un transfer vero.
  if (!payoutProviderConfigured()) {
    return NextResponse.json({
      ok: false,
      pending: true,
      accrued_cents: accrued,
      message: "Il payout reale non è ancora attivo (Stripe Connect in arrivo). Il tuo saldo è al sicuro e non è stato toccato.",
    });
  }

  // Provider reale: registra il payout, poi azzera SOLO dopo averlo registrato.
  const { data: payout, error: payoutErr } = await admin
    .from("payouts")
    .insert({ avatar_id: avatar.id, amount_cents: accrued, status: "paid", provider: process.env.PAYOUT_PROVIDER ?? "stripe" })
    .select("id")
    .single();

  if (payoutErr) {
    return NextResponse.json({ error: "Registrazione payout non riuscita" }, { status: 502 });
  }

  await admin.from("avatars").update({ royalty_accrued_cents: 0 }).eq("id", avatar.id);

  return NextResponse.json({ ok: true, paid_cents: accrued, payout_id: payout.id });
}
