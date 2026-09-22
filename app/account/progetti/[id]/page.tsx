import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CartellaClient, type ScattoScegliibile } from "./CartellaClient";
import { riassunto } from "@/lib/progetti";

export const metadata = { title: "Cartella", robots: { index: false } };

// Dentro una cartella: i propri scatti da spuntare, e l'interruttore del link.
export default async function CartellaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/account/progetti/${id}`)}`);

  const admin = createServerClient();
  const { data: prog, error } = await admin
    .from("progetti")
    .select("id, nome, cliente, nota, slug, link_attivo, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (error) notFound(); // tabella non ancora applicata: la cartella non esiste
  if (!prog || prog.owner_id !== user.id) notFound();

  // I miei scatti (gli ultimi 60) e quali sono gia' dentro.
  const [{ data: gens }, { data: dentro }] = await Promise.all([
    admin
      .from("generations")
      .select("id, certificate, prompt, created_at, avatars!generations_avatar_id_fkey(alias)")
      .eq("buyer_id", user.id)
      .not("certificate", "is", null)
      .order("created_at", { ascending: false })
      .limit(60),
    admin.from("progetto_contenuti").select("generation_id").eq("progetto_id", id),
  ]);
  const giaDentro = new Set((dentro ?? []).map((r) => r.generation_id as string));

  const scatti: ScattoScegliibile[] = (gens ?? []).map((g) => {
    const av = Array.isArray(g.avatars) ? g.avatars[0] : g.avatars;
    return {
      id: g.id as string,
      certificate: (g.certificate as string | null) ?? null,
      alias: (av as { alias?: string } | null)?.alias ?? "Avatar",
      prompt: (g.prompt as string | null) ?? "",
      dentro: giaDentro.has(g.id as string),
    };
  });

  const h = await headers();
  const origin = `https://${h.get("x-forwarded-host") ?? h.get("host") ?? "semblic.com"}`;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <Link href="/account/progetti" className="text-[0.85rem] font-semibold text-muted hover:text-foreground">← Le tue cartelle</Link>
        <h1 className="mt-3 text-balance text-[2rem] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[2.6rem]">{prog.nome}</h1>
        <p className="mt-2 text-[0.98rem] text-muted">{riassunto(giaDentro.size, prog.cliente as string | null)}</p>

        <CartellaClient
          id={prog.id as string}
          slug={prog.slug as string}
          linkAttivo={Boolean(prog.link_attivo)}
          scatti={scatti}
          origin={origin}
        />
      </main>
    </div>
  );
}
