import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { allowRequest } from "@/lib/rate-limit";
import { MAX_RICETTE, ricettaPulita } from "@/lib/ricette";

// Le ricette di Crea: solo le proprie, lette e scritte con la sessione di chi
// chiede (RLS ricette_proprie). Se la tabella non c'e' ancora si risponde
// "non ancora attive" e Crea semplicemente non mostra la riga.

export const runtime = "nodejs";

const CAMPI = "id, nome, scena, luce, vestiti, formato, look, qualita, inquadratura, espressione, posa, certificate, created_at";
const NON_PRONTE = { error: "Le ricette non sono ancora attive.", code: "non_pronte" };

export async function GET() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { data, error } = await auth.from("ricette").select(CAMPI).eq("owner_id", user.id).order("created_at", { ascending: false }).limit(MAX_RICETTE);
  if (error) return NextResponse.json(NON_PRONTE, { status: 503 });
  return NextResponse.json({ ricette: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (!(await allowRequest(`ricette:${user.id}`, 20, 60))) return NextResponse.json({ error: "Troppe richieste, attendi un momento" }, { status: 429 });

  const r = ricettaPulita(await request.json().catch(() => null));
  if (!r) return NextResponse.json({ error: "Dai un nome alla ricetta." }, { status: 400 });

  const { count, error: errConta } = await auth.from("ricette").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
  if (errConta) return NextResponse.json(NON_PRONTE, { status: 503 });
  if ((count ?? 0) >= MAX_RICETTE) return NextResponse.json({ error: `Hai già ${MAX_RICETTE} ricette: togline una per salvarne un'altra.` }, { status: 409 });

  const { data, error } = await auth.from("ricette").insert({ ...r, owner_id: user.id }).select(CAMPI).single();
  if (error || !data) return NextResponse.json(NON_PRONTE, { status: 503 });
  return NextResponse.json({ ok: true, ricetta: data });
}
