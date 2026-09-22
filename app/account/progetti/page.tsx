import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { SiteNav } from "@/components/marketing/SiteNav";
import { ProgettiClient } from "./ProgettiClient";
import type { Progetto } from "@/lib/progetti";

export const metadata = { title: "Le tue cartelle", robots: { index: false } };

// Le cartelle progetto. Se supabase/progetti.sql non e' ancora applicato la
// pagina lo dice e non si rompe (stessa regola di Anima e dei gruppi).
export default async function ProgettiPage() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login?next=%2Faccount%2Fprogetti");

  const admin = createServerClient();
  // GET, non HEAD: su una tabella assente un HEAD torna 204 senza errore e la
  // sonda direbbe "c'e'" (vedi supabase-head-tabella-assente).
  const { data, error } = await admin
    .from("progetti")
    .select("id, nome, cliente, nota, slug, link_attivo, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const pronte = !error;
  const progetti = (data ?? []) as Progetto[];
  const conta = new Map<string, number>();
  if (pronte && progetti.length) {
    const { data: righe } = await admin.from("progetto_contenuti").select("progetto_id").in("progetto_id", progetti.map((p) => p.id));
    for (const r of righe ?? []) conta.set(r.progetto_id as string, (conta.get(r.progetto_id as string) ?? 0) + 1);
  }

  const h = await headers();
  const origin = `https://${h.get("x-forwarded-host") ?? h.get("host") ?? "semblic.com"}`;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <Link href="/account" className="text-[0.85rem] font-semibold text-muted hover:text-foreground">← Il tuo account</Link>
        <h1 className="mt-3 text-balance text-[2rem] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[2.6rem]">Le tue cartelle</h1>
        <p className="mt-2 max-w-[62ch] text-pretty text-[1rem] leading-relaxed text-muted">
          Una cartella raccoglie gli scatti di una campagna. Quando è pronta accendi il link e lo mandi al tuo cliente:
          vede le foto, chi c&apos;è dentro e cosa ha autorizzato, senza bisogno di un account.
        </p>

        {pronte ? (
          <ProgettiClient iniziali={progetti.map((p) => ({ ...p, quanti: conta.get(p.id) ?? 0 }))} origin={origin} />
        ) : (
          <div className="card mt-6 p-6">
            <p className="text-[0.95rem] leading-relaxed text-muted">Le cartelle progetto arrivano a breve.</p>
          </div>
        )}
      </main>
    </div>
  );
}
