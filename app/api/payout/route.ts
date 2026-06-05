import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { PAYOUT_THRESHOLD_CENTS } from "@/lib/wallet";

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

  // Registra il payout nel ledger (audit trail). Rail finto: provider 'mock', stato 'paid'.
  // Quando arriverà Stripe Connect, qui si crea il transfer e si salva provider_ref.
  const { data: payout, error: payoutErr } = await admin
    .from("payouts")
    .insert({ avatar_id: avatar.id, amount_cents: accrued, status: "paid", provider: "mock" })
    .select("id")
    .single();

  if (payoutErr) {
    return NextResponse.json({ error: "Registrazione payout non riuscita" }, { status: 502 });
  }

  // Azzeramento accumulo solo DOPO aver registrato il payout
  await admin.from("avatars").update({ royalty_accrued_cents: 0 }).eq("id", avatar.id);

  return NextResponse.json({ ok: true, paid_cents: accrued, payout_id: payout.id });
}
