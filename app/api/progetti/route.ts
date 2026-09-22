import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { MAX_CLIENTE, MAX_NOME, MAX_NOTA, nuovoSlug, testoPulito } from "@/lib/progetti";

// Le cartelle di chi ha fatto gli scatti. Solo le proprie, sempre.
// Se la tabella non c'e' ancora (supabase/progetti.sql non applicato) si
// risponde "non ancora attive" invece di rompersi: il sito resta in piedi.

export const runtime = "nodejs";

const NON_PRONTE = { error: "Le cartelle progetto non sono ancora attive.", code: "non_pronte" };

export async function GET() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const admin = createServerClient();
  const { data, error } = await admin
    .from("progetti")
    .select("id, nome, cliente, nota, slug, link_attivo, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json(NON_PRONTE, { status: 503 });

  // Quanti scatti in ognuna: una lettura sola, contata in memoria.
  const ids = (data ?? []).map((p) => p.id);
  const conta = new Map<string, number>();
  if (ids.length) {
    const { data: righe } = await admin.from("progetto_contenuti").select("progetto_id").in("progetto_id", ids);
    for (const r of righe ?? []) conta.set(r.progetto_id as string, (conta.get(r.progetto_id as string) ?? 0) + 1);
  }
  return NextResponse.json({ progetti: (data ?? []).map((p) => ({ ...p, quanti: conta.get(p.id) ?? 0 })) });
}

export async function POST(request: Request) {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const nome = testoPulito(body.nome, MAX_NOME);
  if (!nome) return NextResponse.json({ error: "Dai un nome alla cartella." }, { status: 400 });

  const admin = createServerClient();
  const { data, error } = await admin
    .from("progetti")
    .insert({
      owner_id: user.id,
      nome,
      cliente: testoPulito(body.cliente, MAX_CLIENTE),
      nota: testoPulito(body.nota, MAX_NOTA),
      slug: nuovoSlug(),
    })
    .select("id, nome, cliente, nota, slug, link_attivo, created_at")
    .single();
  if (error || !data) return NextResponse.json(NON_PRONTE, { status: 503 });

  return NextResponse.json({ ok: true, progetto: { ...data, quanti: 0 } });
}
