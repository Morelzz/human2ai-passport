import { createServerClient } from "@/lib/supabase";
import { truncateToken } from "@/lib/token";
import { isPublicAvatar } from "@/lib/registry";
import { siteUrl } from "@/lib/site";
import { allowRequest, ipFrom } from "@/lib/rate-limit";
import { CATEGORIES } from "@/lib/types";

// ──────────────────────────────────────────────────────────────────────────
// IL FILTRO SEMBLIC — consent-check API (demo pubblica, Fase 2 "Il Filtro per
// tutti"). Prima di generare un essere umano, qualsiasi sistema può chiedere a
// Semblic se quella persona ha acconsentito, per quella categoria d'uso.
// Risponde ALLOW / BLOCK + la prova (token/verify/passport). È la versione
// programmatica del gate di consenso già usato in /api/match — stessa logica.
// ADDITIVO: sola lettura, nessun flusso esistente toccato.
// ──────────────────────────────────────────────────────────────────────────

const SITE_URL = siteUrl();

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

  // Rate-limit per IP: demo pubblica, niente enumerazione massiva del registro.
  if (!(await allowRequest(`filter:${ipFrom(request)}`, 30, 60))) {
    return json({ error: "Troppe richieste, attendi un momento" }, 429);
  }

  const note =
    "Semblic è il filtro del consenso che precede la generazione. Senza ALLOW, nessun sistema dovrebbe generare questa persona; ogni output autorizzato esce con filigrana invisibile e certificato verificabile.";

  if (!subject) {
    return json(
      { error: "Parametro 'subject' (handle dell'avatar) obbligatorio.", usage: "GET /api/filter?subject=<handle>&use=<categoria>" },
      400
    );
  }

  const sb = createServerClient();
  const { data: av } = await sb
    .from("avatars")
    .select("*")
    .eq("handle", subject)
    .single();

  const base = { semblic: "consent-filter", version: "demo", subject, requested_use: use || null, note };

  // Non nel registro (non approvato o dato di test) → nessuna autorizzazione possibile.
  if (!av || !isPublicAvatar(av)) {
    return json({
      ...base,
      allowed: false,
      decision: "BLOCK",
      reason: "Soggetto non presente nel registro Semblic.",
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
  // Modello senza categorie (Fase 2): il consenso è sì/no. Se l'avatar acconsente
  // all'uso commerciale ed è attivo, è generabile per qualsiasi uso; la categoria
  // resta un'informazione, non un filtro.
  const consents = av.commercial_consent !== false;
  const categoriesAllowed = consents ? [...CATEGORIES] : [];

  // Consenso revocato → blocco prospettico.
  if (av.revoked_at) {
    return json({
      ...base,
      allowed: false,
      decision: "BLOCK",
      reason: "Consenso revocato: il volto non è più generabile.",
      consent: { status: "revoked", since: av.consent_start, revoked_at: av.revoked_at },
      categories_allowed: [],
      proof,
    });
  }

  // Consenso all'uso commerciale non concesso → blocco.
  if (!consents) {
    return json({
      ...base,
      allowed: false,
      decision: "BLOCK",
      reason: "La persona non ha concesso l'uso commerciale del proprio volto.",
      consent: { status: "no_commercial_consent", since: av.consent_start, revoked_at: null },
      categories_allowed: [],
      proof,
    });
  }

  const consent = { status: "active", since: av.consent_start, revoked_at: null };
  return json({
    ...base,
    allowed: true,
    decision: "ALLOW",
    reason: use
      ? `Consenso attivo: la persona è generabile, anche per l'uso "${use}".`
      : "Consenso attivo nel registro: la persona è generabile.",
    consent,
    categories_allowed: categoriesAllowed,
    proof,
  });
}
