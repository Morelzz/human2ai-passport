import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { riassunto } from "@/lib/progetti";
import { Footer } from "@/components/marketing/Footer";

export const dynamic = "force-dynamic";

// ──────────────────────────────────────────────────────────────────────────
// IL LINK PER IL CLIENTE. Chi lo riceve non ha un account e non deve averne
// uno: vede gli scatti, chi c'e' dentro e cosa ha autorizzato. E' anche il
// nostro miglior argomento: la prova di consenso arriva insieme alle foto,
// non in un allegato che nessuno apre.
//
// Si apre solo se il proprietario ha acceso il link: spento, la pagina non
// esiste (404), non "non autorizzato". E non si indovina: l'indirizzo e' di 24
// caratteri casuali. Mai indicizzata dai motori.
// ──────────────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createServerClient();
  const { data } = await admin.from("progetti").select("nome, link_attivo").eq("slug", slug).maybeSingle();
  return {
    title: data?.link_attivo ? `${data.nome} · Semblic` : "Semblic",
    robots: { index: false, follow: false },
  };
}

interface Riga {
  generation_id: string;
  posizione: number;
  generations: {
    certificate: string | null;
    image_url: string | null;
    prompt: string | null;
    created_at: string;
    identity_score: number | null;
    avatars: { alias: string; handle: string; revoked_at: string | null } | { alias: string; handle: string; revoked_at: string | null }[] | null;
  } | null;
}

export default async function PaginaCliente({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createServerClient();

  const { data: prog, error } = await admin
    .from("progetti")
    .select("id, nome, cliente, nota, link_attivo")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !prog || !prog.link_attivo) notFound();

  const { data: righe } = await admin
    .from("progetto_contenuti")
    .select("generation_id, posizione, generations(certificate, image_url, prompt, created_at, identity_score, avatars!generations_avatar_id_fkey(alias, handle, revoked_at))")
    .eq("progetto_id", prog.id)
    .order("posizione");

  const scatti = ((righe ?? []) as unknown as Riga[]).flatMap((r) => {
    const g = r.generations;
    if (!g?.image_url) return [];
    const av = Array.isArray(g.avatars) ? g.avatars[0] : g.avatars;
    return [{
      id: r.generation_id,
      url: g.image_url,
      prompt: g.prompt ?? "",
      cert: g.certificate ?? "",
      quando: g.created_at,
      somiglianza: g.identity_score,
      alias: av?.alias ?? null,
      handle: av?.handle ?? null,
      ritirata: Boolean(av?.revoked_at),
    }];
  });

  const persone = [...new Map(scatti.filter((s) => s.handle).map((s) => [s.handle, { alias: s.alias!, handle: s.handle!, ritirata: s.ritirata }])).values()];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/semblic-mark.png" alt="" aria-hidden className="h-8 w-8 object-contain" />
            <span className="text-[0.85rem] font-bold tracking-[0.18em]">SEMBLIC</span>
          </Link>
          <span className="text-[0.78rem] text-faint">Contenuti certificati</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <span className="kicker">Selezione</span>
        <h1 className="mt-2.5 text-balance text-[2.2rem] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[3rem]">{prog.nome}</h1>
        <p className="mt-2 text-[1rem] text-muted">{riassunto(scatti.length, prog.cliente)}</p>
        {prog.nota && <p className="mt-3 max-w-[60ch] text-pretty text-[0.98rem] leading-relaxed text-muted">{prog.nota}</p>}

        {scatti.length === 0 ? (
          <div className="card mt-8 p-8 text-center">
            <p className="text-[0.95rem] text-muted">In questa selezione non c&apos;è ancora niente.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scatti.map((s) => (
              <figure key={s.id} className="overflow-hidden rounded-[18px] border border-border bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt={s.prompt || "Scatto Semblic"} loading="lazy" className="block w-full" />
                <figcaption className="flex flex-col gap-2 p-3.5">
                  {s.alias && (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.92rem] font-bold tracking-[-0.01em]">{s.alias}</span>
                      {s.somiglianza != null && (
                        <span className="rounded-full border border-verified/25 bg-verified-soft px-2 py-px font-mono text-[0.6rem] font-bold text-on-verified">
                          SOMIGLIANZA {s.somiglianza}%
                        </span>
                      )}
                    </span>
                  )}
                  {s.prompt && <span className="line-clamp-2 text-[0.82rem] leading-snug text-muted">{s.prompt}</span>}
                  {s.cert && (
                    <Link href={`/verify?token=${encodeURIComponent(s.cert)}`} className="font-mono text-[0.66rem] text-faint underline-offset-2 hover:text-amber-ink hover:underline">
                      CERT {s.cert.slice(0, 12)} · controlla
                    </Link>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {/* La prova di consenso, insieme alle foto e non in un allegato. */}
        <section className="card mt-8 p-6">
          <p className="kicker">CHI C&apos;È IN QUESTE FOTO</p>
          <p className="mt-2 max-w-[70ch] text-[0.95rem] leading-relaxed text-muted">
            Non sono volti inventati. Ogni persona è iscritta al registro Semblic con documento verificato, ha firmato il
            consenso all&apos;uso commerciale del proprio volto e ha ricevuto la sua quota su ognuno di questi scatti.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {persone.map((p) => (
              <Link
                key={p.handle}
                href={`/passport/${p.handle}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-[0.88rem] font-semibold transition-colors hover:border-amber/60"
              >
                {p.alias}
                <span className={`h-1.5 w-1.5 rounded-full ${p.ritirata ? "bg-blocked" : "bg-verified"}`} aria-hidden />
                <span className="text-[0.72rem] font-normal text-faint">{p.ritirata ? "si è ritirata" : "consenso attivo"}</span>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-[0.78rem] leading-relaxed text-faint">
            Ogni scatto porta dentro i pixel un certificato che chiunque può controllare, anche senza un account.
          </p>
        </section>

        <div className="mt-6 flex flex-col gap-3 rounded-[20px] border border-amber/30 bg-[linear-gradient(135deg,var(--amber-soft),transparent)] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[1.1rem] font-bold tracking-[-0.02em]">Vuoi contenuti così per la tua campagna?</p>
            <p className="mt-1 max-w-[56ch] text-[0.92rem] leading-relaxed text-muted">
              Persone vere, consenso firmato, una quota a ogni utilizzo. E la prova che puoi allegare alla campagna.
            </p>
          </div>
          <Link href="/" className="shrink-0 rounded-full bg-amber px-5 py-3 text-center text-[0.9rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
            Scopri Semblic
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
