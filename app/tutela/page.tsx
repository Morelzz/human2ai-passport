import Link from "next/link";
import { ScanFace, Fingerprint, ShieldCheck, BadgeCheck, Lock, History, ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { Reveal } from "@/components/motion/Reveal";
import { KineticText } from "@/components/motion/KineticText";

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
export default function TutelaPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />

        {/* ── HERO: il cuore (verifica → faceprint → confronto) ───────────── */}
        <section className="mx-auto max-w-3xl px-5 pb-12 pt-16 text-center sm:px-8 sm:pt-24">
          <span className="label-mono text-teal">Tutela dell&apos;identità</span>
          <h1 className="mt-4 text-balance text-4xl font-extralight leading-[1.05] tracking-[-0.03em] sm:text-5xl">
            <KineticText text="Il tuo volto entra nel registro" />
            <span className="mt-2 block">
              <KineticText text="solo se sei" delay={0.25} />{" "}
              <KineticText text="davvero tu" gradient delay={0.4} />
              <KineticText text="." delay={0.5} />
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Ti verifichiamo una volta, con un documento e un selfie. Da quel momento le foto
            del tuo avatar devono combaciare con quel volto. Gli impostori non passano.
          </p>

          {/* Flusso: tre passi + esito (salvia / coral). Stack su mobile, in riga su desktop. */}
          <div className="mx-auto mt-9 max-w-xl">
            <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-center">
              <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white/[0.02] px-3.5 py-2.5 text-sm">
                <ScanFace className="h-4 w-4 shrink-0" style={{ color: "#F2A93B" }} /> Verifica Didit
              </span>
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-faint sm:block" aria-hidden />
              <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white/[0.02] px-3.5 py-2.5 text-sm">
                <Fingerprint className="h-4 w-4 shrink-0" style={{ color: "#F2A93B" }} /> Faceprint, 128 numeri
              </span>
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-faint sm:block" aria-hidden />
              <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white/[0.02] px-3.5 py-2.5 text-sm">
                <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: "#F2A93B" }} /> Confronto
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", border: "1px solid rgba(127,174,150,0.4)", background: "rgba(127,174,150,0.08)", color: "#7FAE96", borderRadius: 999, padding: "0.35rem 0.85rem", fontSize: "0.78rem" }}>
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Stessa persona, nel registro
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", border: "1px solid rgba(238,122,112,0.4)", background: "rgba(238,122,112,0.08)", color: "#EE7A70", borderRadius: 999, padding: "0.35rem 0.85rem", fontSize: "0.78rem" }}>
                <Lock className="h-3.5 w-3.5" aria-hidden /> Volto diverso, bloccato
              </span>
            </div>
          </div>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup/avatar" className="rounded-full bg-violet-light px-6 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-on-amber transition hover:brightness-110 focus-ring">
              Proteggi il tuo volto
            </Link>
            <Link href="/verify" className="rounded-full border border-border px-6 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-foreground transition hover:border-violet/50 focus-ring">
              Verifica con Sigil
            </Link>
          </div>
        </section>

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
                  d: "Vale da quando autorizzi, finché vuoi: la revoca blocca il futuro, non cancella il passato. Oppure scegli Ward e non sei generabile affatto.",
                  href: "/ward",
                  cta: "Scopri Ward",
                },
              ].map(({ Icon, t, d, href, cta }) => (
                <div key={t} className="glass glass-hover rounded-2xl p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(242,169,59,0.1)", border: "1px solid rgba(242,169,59,0.33)" }}>
                    <Icon className="h-5 w-5" style={{ color: "#F2A93B" }} />
                  </span>
                  <h2 className="mt-4 text-lg font-bold">{t}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
                  <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-light hover:underline">
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
            <div className="glass relative overflow-hidden rounded-[2rem] p-8 sm:p-12">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(242,169,59,0.18),transparent_70%)]" />
              <div className="relative">
                <p className="text-balance text-2xl font-extralight tracking-[-0.02em] sm:text-3xl">Real Humans. Real Rights.</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
                  Una persona vera dietro ogni volto, e il diritto di decidere come viene usato.
                </p>
                <Link href="/signup/avatar" className="mt-7 inline-block rounded-full bg-violet-light px-7 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-on-amber transition hover:brightness-110 focus-ring">
                  Entra nel registro
                </Link>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
