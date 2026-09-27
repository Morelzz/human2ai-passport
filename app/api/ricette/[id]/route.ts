import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase-auth";

export const runtime = "nodejs";

// Togliere una ricetta: solo la propria (RLS), e lo scatto resta dov'e'.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Ricetta non valida" }, { status: 400 });
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const { error } = await auth.from("ricette").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: "Non sono riuscito a toglierla" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
