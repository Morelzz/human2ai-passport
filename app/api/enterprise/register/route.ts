import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

// KYB self-serve (Fase 3.2): una persona loggata registra la propria azienda
// (agenzia) e diventa 'enterprise'. L'azienda nasce kyb_status='pending' e va
// approvata da un operatore (/account/kyb-review) prima di poter onboardare il
// roster. KYB MANUALE per scelta, come il KYC individuale.
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { data: profile } = await auth.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role ?? "buyer";
  // Solo un account 'pulito' (buyer) può diventare azienda: non trasformiamo un
  // Creatore (ha già avatar/KYC propri), un admin o un manager.
  if (role !== "buyer" && role !== "enterprise") {
    return NextResponse.json({ error: "Questo account non può registrare un'azienda. Usa un account dedicato all'agenzia." }, { status: 403 });
  }

  const admin = createServerClient();

  // Una sola azienda per titolare.
  const { data: existing } = await admin.from("organizations").select("id").eq("owner_id", user.id).maybeSingle();
  if (existing) {
    // Self-heal: org creata ma ruolo non promosso (es. fallimento a metà) -> ripara.
    if (role !== "enterprise") {
      await admin.from("profiles").update({ role: "enterprise" }).eq("id", user.id);
      return NextResponse.json({ ok: true, repaired: true });
    }
    return NextResponse.json({ error: "Hai già registrato un'azienda." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  // Honeypot anti-bot: campo invisibile compilato => bot, ok silenzioso.
  if (typeof body.website_hp === "string" && body.website_hp.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name ?? "").trim().slice(0, 160);
  const vatNumber = String(body.vat_number ?? "").trim().slice(0, 40);
  const country = String(body.country ?? "").trim().slice(0, 80);
  const website = String(body.website ?? "").trim().slice(0, 200);
  const contactEmail = (String(body.contact_email ?? "").trim() || user.email || "").slice(0, 200);

  if (name.length < 2) return NextResponse.json({ error: "Inserisci la ragione sociale" }, { status: 400 });
  if (vatNumber.length < 4) return NextResponse.json({ error: "Inserisci la partita IVA o il numero di registrazione" }, { status: 400 });
  if (country.length < 2) return NextResponse.json({ error: "Inserisci il paese" }, { status: 400 });
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactEmail)) {
    return NextResponse.json({ error: "Email di contatto non valida" }, { status: 400 });
  }

  // 1. Crea l'organizzazione (in attesa di KYB).
  const { error: orgErr } = await admin.from("organizations").insert({
    owner_id: user.id,
    name,
    vat_number: vatNumber,
    country,
    website: website || null,
    contact_email: contactEmail || null,
    kyb_status: "pending",
    kyb_submitted_at: new Date().toISOString(),
  });
  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

  // 2. Promuove il profilo a 'enterprise' (sblocca la dashboard agenzia).
  const { error: roleErr } = await admin.from("profiles").update({ role: "enterprise" }).eq("id", user.id);
  if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
