import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { computeTokenHash } from "@/lib/token";
import { CATEGORIES, Tier } from "@/lib/types";

const TIERS: Tier[] = ["SPARK", "SHAPE", "SOUL", "HUMAN"];
const HANDLE_RE = /^[a-z0-9-]{3,30}$/;

export async function POST(request: Request) {
  // 1. Identità: chi sta creando?
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // 2. Autorizzazione: deve essere un creatore verificato
  const { data: profile } = await auth
    .from("profiles")
    .select("role, kyc_status, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "seller") {
    return NextResponse.json({ error: "Solo gli account Creatore possono creare un avatar" }, { status: 403 });
  }
  if (profile?.kyc_status !== "approved") {
    return NextResponse.json({ error: "Devi prima verificare la tua identità (KYC)" }, { status: 403 });
  }

  const admin = createServerClient();

  // 3. Un creatore = un avatar (per ora)
  const { count } = await admin
    .from("avatars")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Hai già un avatar nel registro" }, { status: 409 });
  }

  // 4. Validazione input
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const handle = String(body.handle ?? "").trim().toLowerCase();
  const alias = String(body.alias ?? "").trim();
  const tier = body.tier as Tier;
  const approved: string[] = Array.isArray(body.approved_categories) ? body.approved_categories : [];
  const excluded: string[] = Array.isArray(body.excluded_categories) ? body.excluded_categories : [];

  if (!HANDLE_RE.test(handle)) {
    return NextResponse.json({ error: "Handle non valido (3-30 caratteri: a-z, 0-9, trattino)" }, { status: 400 });
  }
  if (alias.length < 2) {
    return NextResponse.json({ error: "Nome troppo corto" }, { status: 400 });
  }
  if (!TIERS.includes(tier)) {
    return NextResponse.json({ error: "Livello non valido" }, { status: 400 });
  }
  const validApproved = approved.filter((c) => (CATEGORIES as readonly string[]).includes(c));
  const validExcluded = excluded.filter((c) => (CATEGORIES as readonly string[]).includes(c));
  if (validApproved.length === 0) {
    return NextResponse.json({ error: "Seleziona almeno una categoria consentita" }, { status: 400 });
  }

  // 5. Handle univoco
  const { data: existing } = await admin.from("avatars").select("id").eq("handle", handle).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Questo handle è già in uso" }, { status: 409 });
  }

  // 6. Inserimento
  const id = crypto.randomUUID();
  const consentStart = new Date().toISOString().slice(0, 10);
  const tokenHash = computeTokenHash(id, consentStart, validApproved);
  const portraitUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(handle)}&backgroundColor=6B21E8`;

  const { error: insErr } = await admin.from("avatars").insert({
    id,
    owner_id: user.id,
    handle,
    alias,
    portrait_url: portraitUrl,
    tier,
    approved_categories: validApproved,
    excluded_categories: validExcluded,
    consent_start: consentStart,
    token_hash: tokenHash,
    usage_count: 0,
    royalty_accrued_cents: 0,
    is_demo: false,
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  await admin.from("consent_events").insert({
    avatar_id: id,
    event_type: "GRANTED",
    detail: "Consenso iniziale (onboarding creatore)",
    occurred_at: consentStart,
  });

  return NextResponse.json({ handle });
}
