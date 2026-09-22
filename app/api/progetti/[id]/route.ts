import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { MAX_CLIENTE, MAX_CONTENUTI, MAX_NOME, MAX_NOTA, testoPulito } from "@/lib/progetti";

// Una cartella: rinomina, accendi o spegni il link, metti e togli scatti,
// buttala via. Ogni operazione controlla PRIMA che la cartella sia tua, e ogni
// scatto che entra dev'essere uno dei tuoi: una cartella non e' un modo per
// mostrare la roba di qualcun altro.

export const runtime = "nodejs";

async function mia(id: string, userId: string) {
  const admin = createServerClient();
  const { data, error } = await admin
    .from("progetti")
    .select("id, nome, cliente, nota, slug, link_attivo, created_at, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { admin, progetto: null, pronte: false };
  if (!data || data.owner_id !== userId) return { admin, progetto: null, pronte: true };
  return { admin, progetto: data, pronte: true };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const { admin, progetto, pronte } = await mia(id, user.id);
  if (!pronte) return NextResponse.json({ error: "Le cartelle progetto non sono ancora attive.", code: "non_pronte" }, { status: 503 });
  if (!progetto) return NextResponse.json({ error: "Cartella non trovata" }, { status: 404 });

  // 1) Gli scatti che entrano: devono essere TUOI e avere un certificato.
  const aggiungi = Array.isArray(body.aggiungi) ? (body.aggiungi as unknown[]).filter((x): x is string => typeof x === "string").slice(0, MAX_CONTENUTI) : [];
  const togli = Array.isArray(body.togli) ? (body.togli as unknown[]).filter((x): x is string => typeof x === "string").slice(0, MAX_CONTENUTI) : [];

  if (togli.length) {
    await admin.from("progetto_contenuti").delete().eq("progetto_id", id).in("generation_id", togli);
  }
  if (aggiungi.length) {
    const { data: tuoi } = await admin
      .from("generations")
      .select("id")
      .eq("buyer_id", user.id)
      .not("certificate", "is", null)
      .in("id", aggiungi);
    const buoni = (tuoi ?? []).map((g) => g.id as string);
    if (buoni.length !== aggiungi.length) {
      return NextResponse.json({ error: "In una cartella vanno solo i tuoi scatti." }, { status: 403 });
    }
    const { count } = await admin.from("progetto_contenuti").select("generation_id", { count: "exact", head: true }).eq("progetto_id", id);
    if ((count ?? 0) + buoni.length > MAX_CONTENUTI) {
      return NextResponse.json({ error: `In una cartella ci stanno ${MAX_CONTENUTI} scatti.` }, { status: 400 });
    }
    await admin.from("progetto_contenuti").upsert(
      buoni.map((g, i) => ({ progetto_id: id, generation_id: g, posizione: (count ?? 0) + i })),
      { onConflict: "progetto_id,generation_id" },
    );
  }

  // 2) I dati della cartella.
  const patch: Record<string, unknown> = {};
  if ("nome" in body) {
    const n = testoPulito(body.nome, MAX_NOME);
    if (!n) return NextResponse.json({ error: "Dai un nome alla cartella." }, { status: 400 });
    patch.nome = n;
  }
  if ("cliente" in body) patch.cliente = testoPulito(body.cliente, MAX_CLIENTE);
  if ("nota" in body) patch.nota = testoPulito(body.nota, MAX_NOTA);
  if ("link_attivo" in body) patch.link_attivo = body.link_attivo === true;

  if (Object.keys(patch).length) {
    patch.updated_at = new Date().toISOString();
    const { error } = await admin.from("progetti").update(patch).eq("id", id).eq("owner_id", user.id);
    if (error) return NextResponse.json({ error: "Non è stato salvato, riprova." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const admin = createServerClient();
  // Si cancella la cartella, non gli scatti: quelli restano tuoi e certificati.
  const { error } = await admin.from("progetti").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: "Non è stata cancellata, riprova." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
