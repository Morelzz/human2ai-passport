import { redirect } from "next/navigation";
import Link from "next/link";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServerClient } from "@/lib/supabase";
import { formatEur } from "@/lib/wallet";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { ShareStoryButton } from "@/components/share/ShareStoryButton";

export const metadata = {
  title: "Attività del mio volto",
};

// Pagina ADDITIVA, gated: il creatore vede DOVE e QUANDO il suo volto è stato
// usato e quanto ha guadagnato. Riusa generations/royalty già esistenti, nessun
// flusso toccato. Per seller (1 avatar) ed enterprise (N avatar).
type FeedGen = {
  id: string;
  certificate: string | null;
  category: string | null;
  royalty_cents: number | null;
  created_at: string;
  avatars: { alias: string; handle: string } | { alias: string; handle: string }[] | null;
};

function avatarOf(g: FeedGen) {
  return Array.isArray(g.avatars) ? g.avatars[0] : g.avatars;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function AttivitaPage() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServerClient();
  // Tutti gli avatar di cui l'utente è proprietario (seller = 1, enterprise = N).
  const { data: avs } = await admin
    .from("avatars")
    .select("id, handle, alias, royalty_accrued_cents, usage_count")
    .eq("owner_id", user.id);
  const myAvatars = avs ?? [];
  const ids = myAvatars.map((a) => a.id);

  let feed: FeedGen[] = [];
  if (ids.length > 0) {
    const { data: gens } = await admin
      .from("generations")
      .select("id, certificate, category, royalty_cents, created_at, avatars(alias, handle)")
      .in("avatar_id", ids)
      .not("certificate", "is", null)
      .order("created_at", { ascending: false })
      .limit(30);
    feed = (gens ?? []) as FeedGen[];
  }

  const totalRoyalty = myAvatars.reduce((s, a) => s + (a.royalty_accrued_cents ?? 0), 0);
  const totalUses = myAvatars.reduce((s, a) => s + (a.usage_count ?? 0), 0);
  const isEnterprise = myAvatars.length > 1;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        <main className="mx-auto max-w-2xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="mb-8">
            <span className="text-xs font-bold tracking-[0.14em] text-teal">IL TUO VOLTO</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Attività del mio volto</h1>
            <p className="mt-3 leading-relaxed text-muted">
              Ogni volta che qualcuno genera con la tua identità, lo vedi qui, con la royalty che hai guadagnato.
            </p>
          </div>

          {ids.length === 0 ? (
            <div className="glass rounded-2xl p-6">
              <p className="text-sm leading-relaxed text-muted">
                Questa sezione è per chi mette il proprio volto nel registro. Quando il tuo avatar è attivo,
                qui compare ogni suo utilizzo.
              </p>
              <Link href="/account" className="mt-4 inline-block text-sm font-semibold text-teal hover:underline">
                ← Torna all&apos;account
              </Link>
            </div>
          ) : (
            <>
              {/* Totali */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="glass glass-hover rounded-2xl p-5">
                  <div className="text-3xl font-extrabold leading-none text-teal">{formatEur(totalRoyalty)}</div>
                  <p className="mt-2 text-sm text-muted">Maturato per il tuo volto</p>
                </div>
                <div className="glass glass-hover rounded-2xl p-5">
                  <div className="text-3xl font-extrabold leading-none text-violet-light">{totalUses}</div>
                  <p className="mt-2 text-sm text-muted">Utilizzi totali</p>
                </div>
              </div>

              {/* Feed */}
              <div className="mt-6">
                <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-faint">Utilizzi recenti</p>
                {feed.length === 0 ? (
                  <div className="glass rounded-2xl p-6 text-sm leading-relaxed text-muted">
                    Ancora nessun utilizzo. Quando qualcuno genera con il tuo volto, comparirà qui, con la tua royalty.
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {feed.map((g) => {
                      const av = avatarOf(g);
                      return (
                        <li key={g.id} className="glass glass-hover flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {g.category && (
                                <span className="rounded-full border border-violet/30 bg-violet/10 px-2 py-0.5 text-[0.62rem] font-bold tracking-wide text-violet-light">
                                  {g.category}
                                </span>
                              )}
                              <span className="text-xs text-faint">{formatDate(g.created_at)}</span>
                            </div>
                            {isEnterprise && av && (
                              <p className="mt-1 text-sm font-semibold">
                                {av.alias} <span className="text-faint">@{av.handle}</span>
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-teal">+{formatEur(g.royalty_cents ?? 0)}</span>
                            {g.certificate && (
                              <Link
                                href={`/verify?token=${encodeURIComponent(g.certificate)}`}
                                className="text-xs text-violet-light hover:underline"
                              >
                                Verifica →
                              </Link>
                            )}
                            {g.certificate && (
                              // Il seller condivide la generazione col PROPRIO volto:
                              // cornice variante seller, QR verso il suo passport.
                              <ShareStoryButton
                                query={`cert=${encodeURIComponent(g.certificate)}&v=seller`}
                                filename={`semblic-story-${g.certificate.slice(0, 8)}.png`}
                                label="Condividi ↗"
                                className="rounded-full border border-violet/30 bg-violet/10 px-3 py-1.5 text-xs font-semibold text-violet-light transition-colors hover:bg-violet/20 disabled:opacity-50"
                              />
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <p className="mt-8 text-xs leading-relaxed text-faint">
                Mostriamo gli utilizzi commerciali certificati. La revoca del consenso è prospettica:
                blocca gli usi futuri, non cancella quelli già tracciati e attribuiti.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
