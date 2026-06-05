import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/types";

type Action =
  | { type: "revoke_all" }
  | { type: "remove_category"; category: string }
  | { type: "add_category"; category: string }
  | { type: "add_excluded"; category: string }
  | { type: "remove_excluded"; category: string };

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const action = (await request.json().catch(() => null)) as Action | null;
  if (!action) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const admin = createServerClient();

  // L'avatar deve appartenere all'utente
  const { data: avatar } = await admin
    .from("avatars")
    .select("id, approved_categories, excluded_categories, revoked_at")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!avatar) return NextResponse.json({ error: "Nessun avatar da gestire" }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  const approved: string[] = avatar.approved_categories ?? [];
  const excluded: string[] = avatar.excluded_categories ?? [];

  if (action.type === "revoke_all") {
    if (avatar.revoked_at) return NextResponse.json({ error: "Già revocato" }, { status: 409 });
    // Revoca PROSPETTICA: blocca il futuro, non cancella il passato
    await admin.from("avatars").update({ revoked_at: today }).eq("id", avatar.id);
    await admin.from("consent_events").insert({
      avatar_id: avatar.id,
      event_type: "REVOKED",
      detail: "Revoca totale (kill-switch creatore)",
      occurred_at: today,
    });
    return NextResponse.json({ ok: true });
  }

  if (action.type === "remove_category") {
    const cat = String(action.category);
    if (!approved.includes(cat)) return NextResponse.json({ error: "Categoria non presente" }, { status: 400 });
    await admin.from("avatars").update({ approved_categories: approved.filter((c) => c !== cat) }).eq("id", avatar.id);
    await admin.from("consent_events").insert({
      avatar_id: avatar.id,
      event_type: "CATEGORY_REMOVED",
      detail: `Categoria revocata: ${cat}`,
      occurred_at: today,
    });
    return NextResponse.json({ ok: true });
  }

  if (action.type === "add_category") {
    const cat = String(action.category);
    if (!(CATEGORIES as readonly string[]).includes(cat)) return NextResponse.json({ error: "Categoria non valida" }, { status: 400 });
    if (approved.includes(cat)) return NextResponse.json({ error: "Categoria già presente" }, { status: 400 });
    await admin.from("avatars").update({
      approved_categories: [...approved, cat],
      excluded_categories: excluded.filter((c) => c !== cat),
    }).eq("id", avatar.id);
    await admin.from("consent_events").insert({
      avatar_id: avatar.id,
      event_type: "CATEGORY_ADDED",
      detail: `Categoria aggiunta: ${cat}`,
      occurred_at: today,
    });
    return NextResponse.json({ ok: true });
  }

  if (action.type === "add_excluded") {
    const cat = String(action.category);
    if (!(CATEGORIES as readonly string[]).includes(cat)) return NextResponse.json({ error: "Categoria non valida" }, { status: 400 });
    if (excluded.includes(cat)) return NextResponse.json({ error: "Già esclusa" }, { status: 400 });
    // Esclusiva mutua: se era consentita, viene rimossa dalle consentite
    await admin.from("avatars").update({
      excluded_categories: [...excluded, cat],
      approved_categories: approved.filter((c) => c !== cat),
    }).eq("id", avatar.id);
    await admin.from("consent_events").insert({
      avatar_id: avatar.id,
      event_type: "CATEGORY_REMOVED",
      detail: `Categoria esclusa: ${cat}`,
      occurred_at: today,
    });
    return NextResponse.json({ ok: true });
  }

  if (action.type === "remove_excluded") {
    const cat = String(action.category);
    if (!excluded.includes(cat)) return NextResponse.json({ error: "Categoria non esclusa" }, { status: 400 });
    await admin.from("avatars").update({
      excluded_categories: excluded.filter((c) => c !== cat),
    }).eq("id", avatar.id);
    await admin.from("consent_events").insert({
      avatar_id: avatar.id,
      event_type: "CATEGORY_ADDED",
      detail: `Esclusione rimossa: ${cat}`,
      occurred_at: today,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Azione sconosciuta" }, { status: 400 });
}
