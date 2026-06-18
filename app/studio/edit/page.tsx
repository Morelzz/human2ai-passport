import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { createAuthClient } from "@/lib/supabase-auth";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";

export const runtime = "nodejs";
export const metadata = { title: "Semblic Editor", robots: { index: false, follow: false } };

// ──────────────────────────────────────────────────────────────────────────
// /studio/edit — landing del "Semblic Editor" (voce di menu sotto Genera).
// Senza un certificato specifico: mostra le PROPRIE generazioni da scegliere;
// quella selezionata apre l'editor su /studio/edit/[cert]. L'upload di
// un'immagine esterna e un passo futuro (TODO).
// ──────────────────────────────────────────────────────────────────────────
export default async function EditorLanding() {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServerClient();
  const { data: gens } = await admin
    .from("generations")
    .select("id, certificate, image_url, category, created_at, avatars(alias)")
    .eq("buyer_id", user.id)
    .eq("mode", "commercial")
    .not("certificate", "is", null)
    .order("created_at", { ascending: false })
    .limit(60);

  const items = (gens ?? []).filter((g) => g.certificate && g.image_url);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />
        <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="text-3xl font-extralight tracking-[-0.03em] sm:text-4xl">Semblic Editor</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        Scegli una tua generazione da rifinire: preset, luce, colore e altri controlli, in modo non distruttivo.
      </p>
      <p className="mt-1.5 text-[0.72rem] text-faint">Il caricamento di un&apos;immagine esterna arriverà presto.</p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">Non hai ancora generazioni da modificare.</p>
          <Link
            href="/match"
            className="mt-4 inline-block rounded-full bg-[#F2A93B] px-5 py-2.5 text-sm font-bold text-[#412402] transition-[filter] hover:brightness-110"
          >
            Genera la tua prima foto →
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((g) => {
            const av = Array.isArray(g.avatars) ? g.avatars[0] : g.avatars;
            return (
              <Link
                key={g.id}
                href={`/studio/edit/${g.certificate}`}
                className="group overflow-hidden rounded-xl border border-border bg-obsidian-2 transition-colors hover:border-amber/40"
              >
                {g.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.image_url} alt="" className="block aspect-[3/4] w-full bg-obsidian-3 object-cover" />
                )}
                <div className="flex items-center justify-between gap-1 p-2.5">
                  <span className="truncate text-[0.78rem] font-medium text-foreground">{av?.alias ?? "—"}</span>
                  <span className="shrink-0 text-[0.62rem] font-semibold text-amber opacity-0 transition-opacity group-hover:opacity-100">
                    Modifica →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
        </main>
      </div>
    </div>
  );
}
