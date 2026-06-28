import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { allowRequest } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";
import { rdapLookup } from "@/lib/ward/evidence/whois";
import { buildDmcaNotice } from "@/lib/ward/takedown";
import { matchOwner, getProfile, createAction } from "@/lib/ward/takedown-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ward/takedown { matchId } — Nemesis: prepara una DMCA notice per una
// COPIA CONFERMATA. Semblic prepara, l'utente invia: qui creiamo solo la bozza
// (nemesis_actions, status 'drafted') e ritorniamo il testo della notice; il PDF
// lo fa il client. Niente invio automatico.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const allowed = await allowRequest(`ward-takedown:${user.id}`, 30, 60 * 60);
  if (!allowed) return NextResponse.json({ error: "Troppe richieste, riprova piu' tardi" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const matchId = String(body?.matchId ?? "").trim();
  if (!matchId) return NextResponse.json({ error: "matchId mancante" }, { status: 400 });

  const m = await matchOwner(matchId);
  if (!m || m.buyerId !== user.id) return NextResponse.json({ error: "Copia non trovata" }, { status: 404 });

  // Child-safety: i minori non passano dal flusso normale.
  if (m.sensitivity === "minor") return NextResponse.json({ error: "Non disponibile" }, { status: 403 });

  // Solo sulle copie confermate: prima si conferma, poi si rimuove.
  if (m.band !== "confirmed") {
    return NextResponse.json({ error: "La rimozione si avvia solo sulle copie confermate" }, { status: 422 });
  }

  const profile = await getProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Serve il profilo per la richiesta", needsProfile: true }, { status: 409 });
  }

  const abuse = m.host ? await rdapLookup(m.host) : null;
  const verifyUrl = m.certificate ? `${siteUrl()}/verify?token=${encodeURIComponent(m.certificate)}` : null;

  const action = await createAction(matchId);
  const notice = buildDmcaNotice({
    claimant: profile,
    copy: { pageUrl: m.pageUrl, sourceUrl: m.sourceUrl, host: m.host },
    work: { alias: m.alias, certificate: m.certificate, verifyUrl, phash: m.phash, generatedAt: m.generatedAt },
    abuse: abuse ? { domain: abuse.domain, registrar: abuse.registrar, source: abuse.source } : null,
  });

  return NextResponse.json({ ok: true, actionId: action.id, status: action.status, notice });
}
