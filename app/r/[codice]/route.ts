import { NextResponse } from "next/server";
import { codicePulito } from "@/lib/invito";
import { COOKIE_INVITO } from "@/lib/invito-server";

// Il link che si manda agli amici: /r/ABCD2345. Non apre una pagina sua, si
// ricorda chi ti ha mandato e ti porta alla registrazione. Il ricordo dura 30
// giorni e sta solo nel tuo browser: nessuno viene profilato, e fuori da qui
// quel codice non dice niente su di te.
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const c = codicePulito(codice);
  const url = new URL(request.url);
  const dove = new URL(c ? "/signup?invito=1" : "/", url.origin);

  const res = NextResponse.redirect(dove);
  if (c) {
    res.cookies.set(COOKIE_INVITO, c, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false, // lo rilegge anche il modulo di registrazione
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
    });
  }
  return res;
}
