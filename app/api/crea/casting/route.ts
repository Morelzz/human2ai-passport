import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { allowRequest } from "@/lib/rate-limit";
import { getPublicAvatars } from "@/lib/registry";
import { portraitFor } from "@/lib/sample-galleries";
import { sampleSrc } from "@/lib/sample-size";
import { leggiScena, nomiNellaScena, scegliConFissi, type Candidato } from "@/lib/casting";
import { logMatchSearch } from "@/lib/searches";

export const runtime = "nodejs";

// Casting automatico: la scena scritta diventa la scelta dei volti. Non genera
// e non spende VOLT: legge (Claude Haiku) e sceglie dal registro. La pagina Crea
// mostra la scelta prima e dopo lo scatto.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });
  if (!(await allowRequest(`casting:${user.id}`, 20, 60))) {
    return NextResponse.json({ error: "Troppe richieste, attendi un momento" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const scena = String(body?.scena ?? "").trim();
  const sceltoHandle = typeof body?.scelto === "string" ? body.scelto.trim() : "";
  if (scena.length < 4) return NextResponse.json({ error: "Scrivi cosa succede nella foto" }, { status: 400 });

  let lettura;
  try {
    lettura = await leggiScena(scena);
  } catch {
    return NextResponse.json({ error: "Non riesco a leggere la scena, riprova" }, { status: 502 });
  }

  const admin = createServerClient();
  const registro = (await getPublicAvatars(admin)).filter((a) => !a.revoked_at && (a as { commercial_consent?: boolean | null }).commercial_consent !== false);
  const candidati = registro as unknown as Candidato[];
  // Persone fisse: il volto gia' scelto (sempre il primo) e quelle chieste per nome nella frase.
  const scelto = sceltoHandle ? candidati.find((c) => c.handle === sceltoHandle) : undefined;
  const fissi = [...(scelto ? [scelto] : []), ...nomiNellaScena(scena, candidati)];
  const scelte = scegliConFissi(lettura, candidati, fissi);
  const fisso = (h: string | null) => Boolean(h && fissi.some((f) => f.handle === h));

  // La domanda resta nelle statistiche del registro (forma, mai chi cerca):
  // i volti che mancano diventano visibili. Le persone chieste per nome non sono una ricerca.
  if (!fissi.length) for (const p of lettura.persone) {
    const { ruolo: _ruolo, ...attrs } = p;
    void _ruolo;
    logMatchSearch(admin, { attrs: attrs as unknown as Record<string, unknown>, category: null, matched: scelte.some((s) => s.handle), resultsCount: scelte.filter((s) => s.handle).length });
  }

  const volto = (handle: string | null) => {
    const a = handle ? registro.find((r) => r.handle === handle) : null;
    return a ? { handle: a.handle, alias: a.alias, src: sampleSrc(portraitFor(a), 480) } : null;
  };

  return NextResponse.json({
    folla: lettura.folla,
    persone: scelte.map((s) => ({
      ruolo: s.ruolo,
      fisso: fisso(s.handle),
      corrispondenza: s.corrispondenza,
      differenze: s.differenze,
      volto: volto(s.handle),
      alternative: s.alternative.map(volto).filter(Boolean),
    })),
  });
}
