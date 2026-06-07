import { createServerClient } from "@/lib/supabase";
import { truncateToken } from "@/lib/token";

// ──────────────────────────────────────────────────────────────────────────
// IL FILTRO HUMAN2AI — consent-check API (demo pubblica, Fase 2 "Il Filtro per
// tutti"). Prima di generare un essere umano, qualsiasi sistema può chiedere a
// Human2AI se quella persona ha acconsentito, per quella categoria d'uso.
// Risponde ALLOW / BLOCK + la prova (token/verify/passport). È la versione
// programmatica del gate di consenso già usato in /api/match — stessa logica.
// ADDITIVO: sola lettura, nessun flusso esistente toccato.
// ──────────────────────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const subject = (url.searchParams.get("subject") ?? url.searchParams.get("handle") ?? "").trim().toLowerCase();
  const use = (url.searchParams.get("use") ?? url.searchParams.get("category") ?? "").trim();

  const note =
    "Human2AI è il filtro del consenso che precede la generazione. Senza ALLOW, nessun sistema dovrebbe generare questa persona; ogni output autorizzato esce con filigrana invisibile e certificato verificabile.";

  if (!subject) {
    return json(
      { error: "Parametro 'subject' (handle dell'avatar) obbligatorio.", usage: "GET /api/filter?subject=<handle>&use=<categoria>" },
      400
    );
  }

  const sb = createServerClient();
  const { data: av } = await sb
    .from("avatars")
    .select("handle, alias, token_hash, verification_status, revoked_at, consent_start, approved_categories, excluded_categories")
    .eq("handle", subject)
    .single();

  const base = { human2ai: "consent-filter", version: "demo", subject, requested_use: use || null, note };

  // Non nel registro (o non ancora approvato) → nessuna autorizzazione possibile.
  if (!av || (av.verification_status ?? "approved") !== "approved") {
    return json({
      ...base,
      allowed: false,
      decision: "BLOCK",
      reason: "Soggetto non presente nel registro Human2AI.",
      consent: { status: "not_in_registry" },
      categories_allowed: null,
      proof: null,
    });
  }

  const proof = {
    token: av.token_hash,
    token_short: truncateToken(av.token_hash),
    verify_url: `${SITE_URL}/verify?token=${encodeURIComponent(av.token_hash)}`,
    passport_url: `${SITE_URL}/passport/${av.handle}`,
  };
  const approved: string[] = av.approved_categories ?? [];
  const excluded: string[] = av.excluded_categories ?? [];
  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  // Consenso revocato → blocco prospettico.
  if (av.revoked_at) {
    return json({
      ...base,
      allowed: false,
      decision: "BLOCK",
      reason: "Consenso revocato: il volto non è più generabile.",
      consent: { status: "revoked", since: av.consent_start, revoked_at: av.revoked_at },
      categories_allowed: approved,
      proof,
    });
  }

  const consent = { status: "active", since: av.consent_start, revoked_at: null };

  // Controllo per categoria d'uso (stessa logica di scoreAvatar).
  if (use) {
    if (excluded.some((c) => eq(c, use))) {
      return json({ ...base, allowed: false, decision: "BLOCK", reason: `La categoria "${use}" è esplicitamente esclusa dal consenso.`, consent, categories_allowed: approved, proof });
    }
    if (approved.length > 0 && !approved.some((c) => eq(c, use))) {
      return json({ ...base, allowed: false, decision: "BLOCK", reason: `La categoria "${use}" non rientra nel consenso dichiarato.`, consent, categories_allowed: approved, proof });
    }
    return json({ ...base, allowed: true, decision: "ALLOW", reason: `Consenso attivo per la categoria "${use}".`, consent, categories_allowed: approved, proof });
  }

  // Nessuna categoria specificata: consenso attivo, ma invitiamo a precisare l'uso.
  return json({
    ...base,
    allowed: true,
    decision: "ALLOW",
    reason: "Consenso attivo nel registro. Specifica il parametro 'use' per il controllo per categoria d'uso.",
    consent,
    categories_allowed: approved,
    proof,
  });
}
