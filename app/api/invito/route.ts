import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { createAuthClient } from "@/lib/supabase-auth";
import { linkInvito } from "@/lib/invito";
import { COOKIE_INVITO, agganciaInvito, codicePerUtente, riepilogoInviti } from "@/lib/invito-server";

// GET: il mio codice, il mio link e i miei numeri.
// POST: lega questo account a chi l'ha invitato (si chiama una volta, subito
// dopo la registrazione). Il codice arriva dal cookie messo da /r/<codice>.
export const runtime = "nodejs";

export async function GET() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const codice = await codicePerUtente(user.id);
  if (!codice) return NextResponse.json({ error: "Gli inviti non sono ancora attivi.", code: "non_pronti" }, { status: 503 });

  const h = await headers();
  const origin = `https://${h.get("x-forwarded-host") ?? h.get("host") ?? "semblic.com"}`;
  const numeri = await riepilogoInviti(user.id);
  return NextResponse.json({ codice, link: linkInvito(codice, origin), ...(numeri ?? { quanti: 0, attivi: 0, voltGuadagnati: 0 }) });
}

export async function POST() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const c = (await cookies()).get(COOKIE_INVITO)?.value;
  if (!c) return NextResponse.json({ ok: true, agganciato: false });

  const fatto = await agganciaInvito(user.id, c);
  const res = NextResponse.json({ ok: true, agganciato: fatto });
  if (fatto) res.cookies.delete(COOKIE_INVITO);
  return res;
}
