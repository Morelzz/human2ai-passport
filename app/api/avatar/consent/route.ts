import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { deletePrefix } from "@/lib/storage";

export const runtime = "nodejs";

// Modello senza categorie (Fase 2/4): il consenso all'uso commerciale è sì/no.
// Niente più gestione per-categoria. Restano la revoca totale (kill-switch) e la
// riattivazione, che sono la timeline del consenso (guardrail CLAUDE.md #2).
type Action =
  | { type: "revoke_all" }
  | { type: "reactivate" }
  | { type: "set_commercial_consent"; value: boolean };

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
    .select("id, handle, revoked_at, protection_only")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!avatar) return NextResponse.json({ error: "Nessun avatar da gestire" }, { status: 404 });

  // Fase 2.1 (VETO): un profilo in sola protezione non concede alcun uso e non è
  // modificabile verso ALLOW. Qui ogni azione di consenso è vietata.
  if ((avatar as { protection_only?: boolean }).protection_only) {
    return NextResponse.json({ error: "Profilo in sola protezione: il consenso è bloccato e non modificabile." }, { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);

  if (action.type === "revoke_all") {
    if (avatar.revoked_at) return NextResponse.json({ error: "Già revocato" }, { status: 409 });
    // Revoca PROSPETTICA: blocca il futuro, non cancella il passato (le generazioni
    // e i certificati restano come prova). MA le foto-reference grezze (dato
    // biometrico) NON servono più — diritto all'oblio: le cancelliamo subito
    // ("cancello, non cassaforte"). La revoca prospettica non ne risente: senza
    // consenso non si genera comunque.
    await admin.from("avatars").update({ revoked_at: today }).eq("id", avatar.id);
    const purged = await deletePrefix("references", avatar.handle);
    await admin.from("consent_events").insert({
      avatar_id: avatar.id,
      event_type: "REVOKED",
      detail: `Revoca totale (kill-switch creatore)${purged > 0 ? ` · ${purged} foto-reference cancellate` : ""}`,
      occurred_at: today,
    });
    return NextResponse.json({ ok: true, references_deleted: purged });
  }

  if (action.type === "reactivate") {
    if (!avatar.revoked_at) return NextResponse.json({ error: "Già attivo" }, { status: 409 });
    // Riattivazione: il futuro torna disponibile, il passato resta nella timeline
    await admin.from("avatars").update({ revoked_at: null }).eq("id", avatar.id);
    await admin.from("consent_events").insert({
      avatar_id: avatar.id,
      event_type: "GRANTED",
      detail: "Riattivazione consenso",
      occurred_at: today,
    });
    return NextResponse.json({ ok: true });
  }

  if (action.type === "set_commercial_consent") {
    const value = action.value === true;
    await admin.from("avatars").update({ commercial_consent: value }).eq("id", avatar.id);
    await admin.from("consent_events").insert({
      avatar_id: avatar.id,
      event_type: value ? "GRANTED" : "CATEGORY_REMOVED",
      detail: value ? "Uso commerciale: consentito" : "Uso commerciale: non consentito",
      occurred_at: today,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Azione sconosciuta" }, { status: 400 });
}
