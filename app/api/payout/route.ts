import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { PAYOUT_THRESHOLD_CENTS, payoutProviderConfigured } from "@/lib/wallet";
import { pagabile, registroDelVolto } from "@/lib/royalty-registro";

// Payout SIMULATO (Stripe Connect arriverà qui). Azzera l'accumulo a soglia raggiunta.
//
// 23/9/2026, due correzioni:
//  1. SI PAGA IL REGISTRO, NON IL CONTATORE. royalty_accrued_cents fino al lock
//     SQL del 23/9 il proprietario lo poteva riscrivere da solo (provato: da 0 a
//     999.999 centesimi). Il giorno che il provider si accende, qui sarebbe
//     uscito quel numero. Adesso si paga il minore fra contatore e registro
//     (lib/royalty-registro), e un contatore gonfiato finisce nei log.
//  2. PIU' VOLTI. Con maybeSingle() chi possedeva due volti riceveva "Nessun
//     avatar" e non poteva ritirare niente (stesso difetto trovato il 22/9
//     nell'account). Adesso si conta ogni volto.
export async function POST() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const admin = createServerClient();
  const { data: avatars } = await admin
    .from("avatars")
    .select("id, handle, royalty_accrued_cents")
    .eq("owner_id", user.id);

  if (!avatars?.length) return NextResponse.json({ error: "Nessun avatar" }, { status: 404 });

  const conti = await Promise.all(
    avatars.map(async (a) => {
      const p = pagabile(Number(a.royalty_accrued_cents) || 0, await registroDelVolto(admin, a.id as string));
      if (p.sospetto) {
        console.error(
          `[SEMBLIC:SICUREZZA] payout.contatore_gonfiato avatar=${a.handle} contatore=${a.royalty_accrued_cents} registro=${p.dovuto} user=${user.id}`,
        );
      }
      return { id: a.id as string, ...p };
    }),
  );
  const totale = conti.reduce((s, c) => s + c.importo, 0);

  if (totale < PAYOUT_THRESHOLD_CENTS) {
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
      accrued_cents: totale,
      message: "Il payout reale non è ancora attivo (Stripe Connect in arrivo). Il tuo saldo è al sicuro e non è stato toccato.",
    });
  }

  // Provider reale: registra il payout di OGNI volto, poi azzera SOLO quello.
  const pagati: string[] = [];
  for (const c of conti) {
    if (c.importo <= 0) continue;
    const { data: payout, error: payoutErr } = await admin
      .from("payouts")
      .insert({ avatar_id: c.id, amount_cents: c.importo, status: "paid", provider: process.env.PAYOUT_PROVIDER ?? "stripe" })
      .select("id")
      .single();
    if (payoutErr || !payout) {
      return NextResponse.json({ error: "Registrazione payout non riuscita", paid_payouts: pagati }, { status: 502 });
    }
    pagati.push(payout.id as string);
    await admin.from("avatars").update({ royalty_accrued_cents: 0 }).eq("id", c.id);
  }

  return NextResponse.json({ ok: true, paid_cents: totale, payout_ids: pagati });
}
