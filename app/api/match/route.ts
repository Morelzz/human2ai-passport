import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { extractAttributes, scoreAvatar, MATCH_THRESHOLD } from "@/lib/matching";

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

  // 2. Candidati: solo SOUL, consenso attivo (non revocati)
  const admin = createServerClient();
  const { data: candidates } = await admin
    .from("avatars")
    .select("handle, alias, portrait_url, tier, gender, ethnicity, age_range, approved_categories, excluded_categories")
    .eq("tier", "SOUL")
    .is("revoked_at", null);

  // 3. Punteggio
  const scored = (candidates ?? [])
    .map((av) => ({ av, result: scoreAvatar(av, attrs) }))
    .filter((x) => x.result.allowed)
    .sort((a, b) => b.result.score - a.result.score);

  const best = scored[0];

  // 4. Decisione: match o BLOCCO
  if (!best || best.result.score < MATCH_THRESHOLD) {
    return NextResponse.json({
      matched: false,
      attrs,
      reason: "Nessun avatar reale e consenziente corrisponde a questa richiesta.",
    });
  }

  return NextResponse.json({
    matched: true,
    attrs,
    avatar: {
      handle: best.av.handle,
      alias: best.av.alias,
      portrait_url: best.av.portrait_url,
      tier: best.av.tier,
    },
    score: best.result.score,
    reasons: best.result.reasons,
  });
}
