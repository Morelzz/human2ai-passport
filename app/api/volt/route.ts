import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { voltBalance, voltTransactions, LOW_BALANCE_THRESHOLD } from "@/lib/volt";

// Saldo e ultimi movimenti VOLT dell'utente loggato (alimenta il VoltBadge).
// configured=false = migrazione volt.sql non applicata: il badge si nasconde.
export async function GET() {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "non autenticato" }, { status: 401 });

  const balance = await voltBalance(user.id);
  if (balance === null) {
    return NextResponse.json({ configured: false });
  }
  const transactions = await voltTransactions(user.id, 5);
  return NextResponse.json({
    configured: true,
    balance,
    low: balance < LOW_BALANCE_THRESHOLD,
    zero: balance <= 0,
    threshold: LOW_BALANCE_THRESHOLD,
    transactions,
  });
}
