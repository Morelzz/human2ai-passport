import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { extractAttributes, normalizeIdentity, scoreAvatar, specifiedCount } from "@/lib/matching";
import { galleryCount } from "@/lib/sample-galleries";
import { logBlockedRequest } from "@/lib/blocked";
import { isPublicAvatar } from "@/lib/registry";

export async function POST(request: Request) {
  // Richiede autenticazione (la chiamata costa)
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere per cercare" }, { status: 401 });

  const body = await request.json().catch(() => null);
  // Categoria d'uso scelta esplicitamente dal menu (consenso deliberato, non inferito).
  const category = body?.category ? String(body.category).trim() : null;

  // 1. Attributi di IDENTITÀ: dall'identikit strutturato (chip) se presente,
  //    altrimenti dal prompt libero via Claude (retro-compatibile).
  let attrs;
  if (body?.identity && typeof body.identity === "object") {
    attrs = normalizeIdentity(body.identity);
  } else {
    const prompt = String(body?.prompt ?? "").trim();
    if (prompt.length < 5) {
      return NextResponse.json({ error: "Descrivi meglio cosa cerchi" }, { status: 400 });
    }
    try {
      attrs = await extractAttributes(prompt);
    } catch {
      return NextResponse.json({ error: "Errore nell'analisi del prompt" }, { status: 502 });
    }
  }

  // Serve almeno un criterio concreto, altrimenti la ricerca è troppo vaga
  if (specifiedCount(attrs, category) === 0) {
    return NextResponse.json({
      matched: false,
      attrs,
      category,
      results: [],
      reason: "Descrivi almeno una caratteristica (genere, etnia, capelli, età) o scegli una categoria d'uso.",
    });
  }

  // 2. Candidati: solo SOUL, consenso attivo (non revocati)
  const admin = createServerClient();
  const { data: candidates } = await admin
    .from("avatars")
    .select("*")
    .eq("tier", "SOUL")
    .is("revoked_at", null);

  // 3. Filtro rigido: SOLO avatar del registro pubblico (approvati, niente
  // dati di test — fonte unica lib/registry) che soddisfano TUTTI i criteri
  const matches = (candidates ?? [])
    .filter(isPublicAvatar)
    .map((av) => ({ av, result: scoreAvatar(av, attrs, category) }))
    .filter((x) => x.result.allowed)
    .sort((a, b) => b.result.score - a.result.score);

  // 4. Decisione: nessun match -> BLOCCO. Il blocco viene loggato (forma della
  // domanda, mai chi chiede): è il numero manifesto del Transparency Report e
  // la heatmap della domanda scoperta (quali volti mancano al registro).
  if (matches.length === 0) {
    logBlockedRequest(admin, { source: "match", reason: "no_match", category, attrs: attrs as unknown as Record<string, unknown> });
    return NextResponse.json({
      matched: false,
      attrs,
      category,
      results: [],
      reason: "Nessun avatar reale e consenziente corrisponde a questa richiesta.",
    });
  }

  return NextResponse.json({
    matched: true,
    attrs,
    category,
    results: matches.map((m) => ({
      handle: m.av.handle,
      alias: m.av.alias,
      portrait_url: m.av.portrait_url,
      tier: m.av.tier,
      reasons: m.result.reasons,
      gallery_count: galleryCount(m.av.handle),
    })),
  });
}
