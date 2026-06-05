import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { extractAttributes, scoreAvatar, specifiedCount } from "@/lib/matching";

export async function POST(request: Request) {
  // Richiede autenticazione (la chiamata costa)
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere per cercare" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const prompt = String(body?.prompt ?? "").trim();
  if (prompt.length < 5) {
    return NextResponse.json({ error: "Descrivi meglio cosa cerchi" }, { status: 400 });
  }

  // 1. Estrai attributi dal prompt
  let attrs;
  try {
    attrs = await extractAttributes(prompt);
  } catch {
    return NextResponse.json({ error: "Errore nell'analisi del prompt" }, { status: 502 });
  }

  // Serve almeno un attributo concreto, altrimenti la ricerca è troppo vaga
  if (specifiedCount(attrs) === 0) {
    return NextResponse.json({
      matched: false,
      attrs,
      results: [],
      reason: "Descrivi almeno una caratteristica (genere, etnia, capelli, età o uso).",
    });
  }

  // 2. Candidati: solo SOUL, consenso attivo (non revocati)
  const admin = createServerClient();
  const { data: candidates } = await admin
    .from("avatars")
    .select("handle, alias, portrait_url, tier, gender, ethnicity, hair_color, age_range, approved_categories, excluded_categories")
    .eq("tier", "SOUL")
    .is("revoked_at", null);

  // 3. Filtro rigido: tieni SOLO chi soddisfa TUTTI gli attributi richiesti
  const matches = (candidates ?? [])
    .map((av) => ({ av, result: scoreAvatar(av, attrs) }))
    .filter((x) => x.result.allowed)
    .sort((a, b) => b.result.score - a.result.score);

  // 4. Decisione: nessun match -> BLOCCO
  if (matches.length === 0) {
    return NextResponse.json({
      matched: false,
      attrs,
      results: [],
      reason: "Nessun avatar reale e consenziente corrisponde a questa richiesta.",
    });
  }

  return NextResponse.json({
    matched: true,
    attrs,
    results: matches.map((m) => ({
      handle: m.av.handle,
      alias: m.av.alias,
      portrait_url: m.av.portrait_url,
      tier: m.av.tier,
      reasons: m.result.reasons,
    })),
  });
}
