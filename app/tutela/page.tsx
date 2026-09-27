import Link from "next/link";
import { ScanFace, BadgeCheck, Lock, History, ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { Reveal } from "@/components/motion/Reveal";
import { fotoPagina } from "@/lib/foto-pagine";
import { Copertina } from "@/components/marketing/pagine/Copertina";

export const metadata = {
  title: "Tutela dell'identità",
  description:
    "Come Semblic protegge il tuo volto: verifica dell'identità con documento e selfie, confronto del volto verificato con le foto dell'avatar, nessuna foto conservata.",
};

// Pagina di riferimento sulla TUTELA DELL'IDENTITA' (cuore + pilastri). Spiega a
// pubblico, creatori e aziende come leghiamo il volto verificato (KYC) alle foto
// dell'avatar: faceprint a 128 numeri, blocco se non combacia, nessuna foto
// conservata. Solo contenuto + link, stile cinematic condiviso.
// Vedi docs/superpowers/specs/2026-06-23-pagina-tutela-identita-design.md.
export default async function TutelaPage() {
  const copertina = await fotoPagina("tutela");
  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />

        {/* ── HERO: il cuore (verifica faceprint confronto) ───────────── */}
        <Copertina
          copertina={copertina}
          occhiello="Tutela dell'identità"
          titolo="Il tuo volto entra nel registro solo se sei davvero tu."
          sotto={
            <>
              Ti verifichiamo una volta, con un documento e un selfie. Da quel momento le foto del tuo avatar devono
              combaciare con quel volto. Gli impostori non passano.
              <span className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[0.78rem]">
                <span className="rounded-full border border-white/20 px-3 py-1.5">Verifica Didit</span>
                <span aria-hidden className="text-white/40">→</span>
                <span className="rounded-full border border-white/20 px-3 py-1.5">Faceprint, 128 numeri</span>
                <span aria-hidden className="text-white/40">→</span>
                <span className="rounded-full border border-white/20 px-3 py-1.5">Confronto</span>
              </span>
              <span className="mt-2 flex flex-wrap gap-2 font-mono text-[0.78rem]">
                <span className="rounded-full border border-[#3DDC97]/40 px-3 py-1.5 text-[#7FD9A8]">stessa persona, nel registro</span>
                <span className="rounded-full border border-[#EE7A70]/40 px-3 py-1.5 text-[#EE9A92]">volto diverso, bloccato</span>
              </span>
            </>
          }
          azioni={
            <>
              <Link href="/signup/avatar" className="inline-flex h-12 items-center rounded-full bg-amber px-6 text-[0.98rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">Proteggi il tuo volto</Link>
              <Link href="/verify" className="inline-flex h-12 items-center rounded-full border border-white/25 px-5 text-[0.95rem] font-semibold text-[#F4EEE3] transition-colors hover:border-[#E29A2E]">Verifica con Sigil</Link>
            </>
          }
        />

        {/* ── I PILASTRI ──────────────────────────────────────────────────── */}
        <Reveal>
          <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  Icon: BadgeCheck,
                  t: "Verifica reale",
                  d: "Documento d'identità e selfie con controllo di vivenza. Dietro ogni volto c'è una persona vera, non un profilo qualsiasi.",
                  href: "/signup/avatar",
                  cta: "Inizia la verifica",
                },
                {
                  Icon: ScanFace,
                  t: "Confronto volto",
                  d: "Le foto del tuo avatar devono combaciare col volto del documento verificato. Chi prova a usare il volto di un altro viene bloccato.",
                  href: "/trasparenza",
                  cta: "Il filtro al lavoro",
                },
                {
                  Icon: Lock,
                  t: "Privacy by design",
                  d: "Non conserviamo nessuna foto: solo un'impronta di 128 numeri da cui il volto non si ricostruisce. Mai dati biometrici on-chain.",
                  href: "/privacy",
                  cta: "La nostra privacy",
                },
                {
                  Icon: History,
                  t: "Consenso e revoca",
                  d: "Vale da quando autorizzi, finché vuoi: la revoca blocca il futuro, non cancella il passato. Oppure registri il volto e non sei generabile affatto.",
                  href: "/signup/avatar/protected",
                  cta: "Proteggi il tuo volto",
                },
              ].map(({ Icon, t, d, href, cta }) => (
                <div key={t} className="card transition-colors hover:border-amber/60 rounded-2xl p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(242,169,59,0.1)", border: "1px solid rgba(242,169,59,0.33)" }}>
                    <Icon className="h-5 w-5" style={{ color: "var(--amber-ink)" }} />
                  </span>
                  <h2 className="mt-4 text-lg font-bold">{t}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                  <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-ink hover:underline">
                    {cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ── CHIUSURA ────────────────────────────────────────────────────── */}
        <Reveal>
          <section className="mx-auto max-w-3xl px-5 py-12 pb-24 text-center sm:px-8">
            <div className="card relative overflow-hidden rounded-[2rem] p-8 sm:p-12">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(242,169,59,0.18),transparent_70%)]" />
              <div className="relative">
                <p className="text-balance text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Real Humans. Real Rights.</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
                  Una persona vera dietro ogni volto, e il diritto di decidere come viene usato.
                </p>
                <Link href="/signup/avatar" className="mt-7 inline-block rounded-full bg-amber px-7 py-3 text-[0.9rem] font-semibold text-on-amber transition hover:brightness-110 focus-ring">
                  Entra nel registro
                </Link>
              </div>
            </div>
          </section>
        </Reveal>
        <Footer />
      </div>
    </div>
  );
}
