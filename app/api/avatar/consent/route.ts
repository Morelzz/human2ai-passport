import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { deletePrefix } from "@/lib/storage";
import { removeHandleFromFaceIndex } from "@/lib/face-index";
import { revocaRegistro } from "@/lib/registro-cache";
import { voltoDelTitolare, handlePulito } from "@/lib/volto-del-titolare";
import { regolePulite, MAX_REGOLE } from "@/lib/regole-consenso";

export const runtime = "nodejs";

// Modello senza categorie (Fase 2/4): il consenso all'uso commerciale è sì/no.
// Niente più gestione per-categoria. Restano la revoca totale (kill-switch) e la
// riattivazione, che sono la timeline del consenso (guardrail CLAUDE.md #2).
// `handle` (facoltativo) dice su quale volto si agisce, per chi ne ha piu' di
// uno: vale solo se il volto e' suo. Senza, il volto che conta (lib/volto-del-titolare).
type Action = { handle?: string } & (
  | { type: "revoke_all" }
  | { type: "reactivate" }
  | { type: "set_commercial_consent"; value: boolean }
  | { type: "set_video_consent"; value: boolean }
  | { type: "set_regole"; regole: string }
);

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const action = (await request.json().catch(() => null)) as Action | null;
  if (!action) return NextResponse.json({ error: "Dati non validi" }, { status: 400 });

  const admin = createServerClient();

  // L'avatar deve appartenere all'utente
  const avatar = await voltoDelTitolare<{ id: string }>(admin, user.id, "id", { handle: handlePulito(action.handle) });
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
    // M11: togli subito il volto dall'indice di ricerca, cosi Sigil non puo piu
    // nominarlo dopo la revoca (oblio: nessuna finestra fino al rebuild manuale).
    const deindexed = await removeHandleFromFaceIndex(avatar.handle).catch(() => 0);
    await admin.from("consent_events").insert({
      avatar_id: avatar.id,
      event_type: "REVOKED",
      detail: `Revoca totale (kill-switch creatore)${purged > 0 ? ` · ${purged} foto-reference cancellate` : ""}`,
      occurred_at: today,
    });
    revocaRegistro(); // la vetrina deve dire "Revocato" subito
    return NextResponse.json({ ok: true, references_deleted: purged, deindexed });
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
    revocaRegistro();
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

  // Video (Anima): un si' a parte, che si da' solo sopra al si' commerciale.
  if (action.type === "set_video_consent") {
    const value = action.value === true;
    if (value) {
      const { data: comm } = await admin.from("avatars").select("commercial_consent").eq("id", avatar.id).maybeSingle();
      if (comm?.commercial_consent === false) {
        return NextResponse.json({ error: "Per dire sì al video serve prima il sì all'uso commerciale." }, { status: 409 });
      }
    }
    const patch: Record<string, unknown> = { video_consent: value };
    if (value) patch.video_consent_at = new Date().toISOString();
    const { error: vErr } = await admin.from("avatars").update(patch).eq("id", avatar.id);
    // Colonna assente = migrazione anima_video.sql non ancora applicata.
    if (vErr) return NextResponse.json({ error: "Il consenso al video arriva a breve." }, { status: 503 });
    await admin.from("consent_events").insert({
      avatar_id: avatar.id,
      event_type: value ? "GRANTED" : "CATEGORY_REMOVED",
      detail: value ? "Video (Anima): consentito, senza audio" : "Video (Anima): non consentito",
      occurred_at: today,
    });
    return NextResponse.json({ ok: true });
  }

  // Le regole scritte a parole (lib/regole-consenso): prima di ogni scatto un
  // giudice legge la scena contro queste parole. Vuoto = nessuna regola.
  if (action.type === "set_regole") {
    if (typeof action.regole === "string" && action.regole.trim().length > MAX_REGOLE) {
      return NextResponse.json({ error: `Al massimo ${MAX_REGOLE} caratteri.` }, { status: 400 });
    }
    const regole = regolePulite(action.regole);
    const { error: rErr } = await admin
      .from("avatars")
      .update({ regole, regole_aggiornate_at: new Date().toISOString() })
      .eq("id", avatar.id);
    // Colonna assente = migrazione regole_consenso.sql non ancora applicata.
    if (rErr) return NextResponse.json({ error: "Le regole scritte arrivano a breve." }, { status: 503 });
    // Nella timeline resta il testo in vigore da oggi: e' la prova di cosa valeva quando.
    await admin.from("consent_events").insert({
      avatar_id: avatar.id,
      event_type: regole ? "CATEGORY_REMOVED" : "CATEGORY_ADDED",
      detail: regole ? `Regole scritte: "${regole}"` : "Regole scritte tolte",
      occurred_at: today,
    });
    return NextResponse.json({ ok: true, regole });
  }

  return NextResponse.json({ error: "Azione sconosciuta" }, { status: 400 });
}
