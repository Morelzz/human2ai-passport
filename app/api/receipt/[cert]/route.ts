import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

// Fase 3.3 (readiness enterprise): RICEVUTA DI CONFORMITA' scaricabile. Attesta
// che una generazione e' passata dal percorso di consenso verificato di Human2AI.
// Pensata per l'archivio audit dell'azienda (seme del futuro Consent Receipt API).
// Accesso col CERTIFICATO (segreto-nell'URL, come /api/content/[cert] e /verify):
// ce l'ha chi ha generato. Nessun dato personale: solo l'identita' PUBBLICA
// dell'avatar (handle/alias) + l'ambito di consenso, mai biometria o dati del buyer.
export async function GET(request: Request, { params }: { params: Promise<{ cert: string }> }) {
  const { cert } = await params;
  if (!cert || cert.length < 16) return NextResponse.json({ error: "Certificato non valido" }, { status: 400 });

  const admin = createServerClient();
  const { data: gen } = await admin
    .from("generations")
    .select("certificate, category, mode, created_at, avatars(handle, alias, consent_start, approved_categories, revoked_at)")
    .eq("certificate", cert)
    .maybeSingle();
  if (!gen) return NextResponse.json({ error: "Ricevuta non trovata per questo certificato" }, { status: 404 });

  const av = Array.isArray(gen.avatars) ? gen.avatars[0] : gen.avatars;
  const base = siteUrl();
  const category = gen.category ?? null;
  const inScope = !category || (Array.isArray(av?.approved_categories) && av!.approved_categories.includes(category));

  const receipt = {
    issuer: "Human2AI",
    document: "Ricevuta di conformita' del consenso",
    certificate: gen.certificate,
    issued_at: new Date().toISOString(),
    subject: {
      handle: av?.handle ?? null,
      alias: av?.alias ?? null,
      registry_url: av?.handle ? `${base}/passport/${av.handle}` : null,
    },
    generation: { date: String(gen.created_at).slice(0, 10), category, mode: gen.mode ?? "commercial" },
    consent: {
      verified_person: true, // l'avatar e' nel registro consensuale verificato
      consent_since: av?.consent_start ?? null,
      category_in_scope: inScope, // ambito CORRENTE; al momento della gen il gate l'ha gia' imposto
      revoked: Boolean(av?.revoked_at),
      revoked_at: av?.revoked_at ?? null,
    },
    verification_url: `${base}/verify`,
    statement:
      "Questa generazione e' stata prodotta tramite Human2AI dal percorso di consenso verificato: il volto " +
      "appartiene a una persona reale presente nel registro, che ha prestato consenso per l'uso, e la categoria " +
      "rientrava nell'ambito autorizzato al momento della generazione. Il certificato e' verificabile su " +
      `${base}/verify.`,
  };

  const headers: Record<string, string> = { "Content-Type": "application/json; charset=utf-8" };
  if (new URL(request.url).searchParams.get("download") === "1") {
    headers["Content-Disposition"] = `attachment; filename="conformita-${cert.slice(0, 12)}.json"`;
  }
  return new NextResponse(JSON.stringify(receipt, null, 2), { headers });
}
