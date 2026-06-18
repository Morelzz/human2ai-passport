import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { coerceEditState } from "@/lib/editor/types";

export const runtime = "nodejs";

// ──────────────────────────────────────────────────────────────────────────
// /api/edit/save — salva lo stato (non distruttivo) dell'editor su una
// generazione (owner check). Cosi riaprendo l'editor le modifiche tornano.
// ──────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Devi accedere" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const cert = String(body?.cert ?? "").trim();
  if (!cert) return NextResponse.json({ error: "Certificato mancante" }, { status: 400 });

  const admin = createServerClient();
  const { data: gen } = await admin.from("generations").select("id, buyer_id").eq("certificate", cert).maybeSingle();
  if (!gen || gen.buyer_id !== user.id) return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const state = coerceEditState(body?.editState);
  const { error } = await admin.from("generations").update({ edit_state: state }).eq("id", gen.id);
  if (error) return NextResponse.json({ error: "Salvataggio non riuscito" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
