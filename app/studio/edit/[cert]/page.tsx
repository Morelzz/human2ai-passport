import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { createAuthClient } from "@/lib/supabase-auth";
import { defaultEditState } from "@/lib/editor/types";
import { EditorClient } from "./EditorClient";

export const runtime = "nodejs";
// Documento privato dell'utente: fuori dagli indici.
export const metadata = { title: "Semblic Editor", robots: { index: false, follow: false } };

// ──────────────────────────────────────────────────────────────────────────
// /studio/edit/[cert] — apre il Semblic Editor su UNA generazione (per
// certificato). Come /api/content/[cert]: il certificato e un capability-token
// ma serve la sessione del PROPRIETARIO. 404 a sessione non proprietaria o
// generazione assente (non riveliamo se un certificato esiste).
// L'anteprima usa l'immagine watermarkata che l'utente puo gia vedere; la resa
// finale delle modifiche sara server-side (fase successiva).
// ──────────────────────────────────────────────────────────────────────────
export default async function EditPage({ params }: { params: Promise<{ cert: string }> }) {
  const { cert } = await params;

  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServerClient();
  const { data: gen } = await admin
    .from("generations")
    .select("certificate, buyer_id, image_url, category, avatars(alias)")
    .eq("certificate", cert)
    .maybeSingle();

  if (!gen || !gen.image_url || gen.buyer_id !== user.id) notFound();

  const av = Array.isArray(gen.avatars) ? gen.avatars[0] : gen.avatars;

  return (
    <EditorClient
      cert={cert}
      imageUrl={gen.image_url}
      alias={av?.alias ?? "—"}
      category={gen.category ?? null}
      initialState={defaultEditState()}
    />
  );
}
