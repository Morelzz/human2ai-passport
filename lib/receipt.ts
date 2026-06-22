import { createServerClient } from "@/lib/supabase";
import { siteUrl } from "@/lib/site";

// Fase 3.3 (readiness enterprise): la RICEVUTA DI CONFORMITA' di una generazione.
// Fonte UNICA condivisa da /api/receipt/[cert] (JSON, per l'archivio/API) e da
// /receipt/[cert] (pagina stampabile, "Stampa -> Salva come PDF" per l'azienda).
// Accesso col certificato (segreto-nell'URL): nessun dato personale, solo
// l'identita' PUBBLICA dell'avatar (handle/alias) + l'ambito di consenso.

export type ComplianceReceipt = {
  issuer: string;
  document: string;
  certificate: string;
  issued_at: string;
  subject: { handle: string | null; alias: string | null; registry_url: string | null };
  generation: { date: string; category: string | null; mode: string };
  consent: {
    verified_person: boolean;
    consent_since: string | null;
    category_in_scope: boolean;
    revoked: boolean;
    revoked_at: string | null;
  };
  verification_url: string;
  statement: string;
};

// Costruisce la ricevuta per un certificato di generazione. Null se il certificato
// e' assente/non valido (il chiamante decide lo status: 400 formato, 404 non trovato).
// issuedAtIso passato dall'esterno: ogni route stampa il momento dell'emissione.
export async function buildComplianceReceipt(
  cert: string,
  issuedAtIso: string,
): Promise<ComplianceReceipt | null> {
  if (!cert || cert.length < 16) return null;

  const admin = createServerClient();
  const { data: gen } = await admin
    .from("generations")
    .select("certificate, category, mode, created_at, avatars(handle, alias, consent_start, commercial_consent, revoked_at)")
    .eq("certificate", cert)
    .maybeSingle();
  if (!gen) return null;

  const av = Array.isArray(gen.avatars) ? gen.avatars[0] : gen.avatars;
  const base = siteUrl();
  const category = gen.category ?? null;
  // Modello senza categorie (Fase 2/4): l'uso è autorizzato se la persona acconsente
  // all'uso commerciale. Al momento della generazione il gate del consenso l'ha già imposto.
  const inScope = av?.commercial_consent !== false;

  return {
    issuer: "Semblic",
    document: "Ricevuta di conformita' del consenso",
    certificate: gen.certificate,
    issued_at: issuedAtIso,
    subject: {
      handle: av?.handle ?? null,
      alias: av?.alias ?? null,
      registry_url: av?.handle ? `${base}/passport/${av.handle}` : null,
    },
    generation: { date: String(gen.created_at).slice(0, 10), category, mode: gen.mode ?? "commercial" },
    consent: {
      verified_person: true, // l'avatar e' nel registro consensuale verificato
      consent_since: av?.consent_start ?? null,
      category_in_scope: inScope,
      revoked: Boolean(av?.revoked_at),
      revoked_at: av?.revoked_at ?? null,
    },
    verification_url: `${base}/verify`,
    statement:
      "Questa generazione e' stata prodotta tramite Semblic dal percorso di consenso verificato: il volto " +
      "appartiene a una persona reale presente nel registro, che ha prestato consenso all'uso commerciale " +
      "della propria immagine al momento della generazione. Il certificato e' verificabile su " +
      `${base}/verify.`,
  };
}
