"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { VoltBadge } from "@/components/volt/VoltBadge";
import { ThemeToggle } from "@/components/ThemeToggle";

// Menu per INTENTO: Avatar (il registro) e Academy sono voci DIRETTE (il cuore
// del prodotto e la scuola, in vista per scelta di Morelz); il resto in 3
// macro -> Genera (creare, anche aziende), Proteggi (il tuo volto + Sigil),
// Fiducia (capire, valutare, contattare). Le tendine possono avere mini
// sotto-titoli ({ heading }). UNA struttura per desktop (dropdown hover) e
// hamburger (accordion).
type NavItem = { href: string; label: string } | { heading: string };
type NavEntry =
  | { label: string; href: string }
  | { label: string; items: NavItem[] };

const NAV: NavEntry[] = [
  { label: "Avatar", href: "/catalogo" },
  { label: "Genera", items: [
    { href: "/match", label: "Genera" },
    { href: "/brand", label: "Per i brand" },
    { href: "/studio/edit", label: "Semblic Editor" },
    { heading: "Per le aziende" },
    { href: "/studio", label: "Studio" },
    { href: "/enterprise", label: "Enterprise" },
  ] },
  { label: "Proteggi", items: [
    { href: "/tutela", label: "Tutela" },
    { href: "/scansione", label: "Scansione" },
    { href: "/entra", label: "Entra nel registro" },
    { href: "/ward", label: "Ward e Nemesis" },
    { href: "/verify", label: "Sigil" },
  ] },
  { label: "Academy", href: "/academy" },
  { label: "Fiducia", items: [
    { href: "/blog", label: "Blog" },
    { href: "/prezzi", label: "Prezzi" },
    { href: "/trasparenza", label: "Trasparenza" },
    { href: "/ai-act", label: "AI Act" },
    { href: "/contatti", label: "Contatti" },
  ] },
];

export function Navbar({ firstName, unseen = 0, volt = null, voltThreshold = 50 }: { firstName: string | null; unseen?: number; volt?: number | null; voltThreshold?: number }) {
  const [open, setOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null); // accordion del drawer
  const badge = unseen > 0 ? (unseen > 9 ? "9+" : String(unseen)) : null;

  // Nav "viva": oltre la soglia di scroll il vetro si addensa e la barra si restringe.
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  // Blocca lo scroll del body e chiude con Esc quando il drawer è aperto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  // Chiudendo il drawer si richiude anche la sezione eventualmente aperta.
  useEffect(() => { if (!open) setOpenSection(null); }, [open]);

  // Voce di primo livello (desktop): niente a-capo (prima "Il tuo volto" si
  // spezzava su due righe) e underline AMBRA che cresce da sinistra all'hover,
  // firma cinematica in linea col sistema (accento Amber + easing del brand).
  const topLinkBase =
    "relative whitespace-nowrap text-[0.9rem] font-medium text-muted transition-colors duration-300 hover:text-foreground after:pointer-events-none after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-amber after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.22,1,0.36,1)]";

  return (
    <>
    <header
      className={`sticky top-0 z-40 border-b border-border backdrop-blur-xl transition-all duration-500 ${
        scrolled
          ? "bg-[var(--nav-bg-scrolled)] shadow-[0_10px_30px_-22px_rgba(23,21,15,0.35)]"
          : "bg-[var(--nav-bg)]"
      }`}
    >
      <ScrollProgress />
      <nav className={`mx-auto flex max-w-7xl items-center justify-between px-5 transition-all duration-500 sm:px-8 ${scrolled ? "h-[3.4rem]" : "h-16"}`}>
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/semblic-mark.png" alt="" aria-hidden className="h-8 w-8 shrink-0 object-contain [mask-image:radial-gradient(circle,#000_62%,transparent_84%)] [-webkit-mask-image:radial-gradient(circle,#000_62%,transparent_84%)]" />
          <span className="text-sm font-bold tracking-[0.2em]">SEMBLIC</span>
        </Link>

        {/* Desktop (lg+): Avatar/Genera diretti + 3 tendine HOVER. La tendina apre
            al passaggio del cursore (incluso il pannello, grazie al ponte pt-3) e
            si chiude appena esci. Il click col mouse fa blur del bottone (e.detail
            > 0) cosi' NON resta "incollata"; il focus da tastiera (e.detail = 0)
            resta accessibile via group-focus-within. */}
        <div className="hidden items-center gap-5 xl:flex">
          {NAV.map((entry) =>
            "items" in entry ? (
              <div key={entry.label} className="group relative">
                <button
                  type="button"
                  aria-haspopup="true"
                  onClick={(e) => { if (e.detail) e.currentTarget.blur(); }}
                  className={`flex items-center gap-1 ${topLinkBase} group-hover:text-foreground group-hover:after:scale-x-100 group-focus-within:text-foreground group-focus-within:after:scale-x-100`}
                >
                  {entry.label}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
                </button>
                <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  <div className="card flex min-w-[12rem] flex-col gap-0.5 p-2 shadow-[0_24px_60px_-30px_rgba(23,21,15,0.35)]">
                    {entry.items.map((it) =>
                      "heading" in it ? (
                        <div key={it.heading} className="kicker mt-1.5 px-3 pb-1 pt-1 text-[0.58rem] text-faint">{it.heading}</div>
                      ) : (
                        <Link key={it.href} href={it.href} className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-[var(--hairline)] hover:text-foreground">{it.label}</Link>
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <Link key={entry.href} href={entry.href} className={`${topLinkBase} hover:after:scale-x-100`}>{entry.label}</Link>
            )
          )}

          {/* Divisore hairline: separa la NAVIGAZIONE dalle AZIONI (declutter) */}
          <span aria-hidden className="mx-1 h-5 w-px bg-[var(--hairline)]" />

          {/* Cluster azioni: VOLT, account, tema, Sigil, Proteggiti */}
          <div className="flex items-center gap-3">
            {firstName && volt !== null && <VoltBadge initial={volt} threshold={voltThreshold} />}
            {firstName ? (
              <Link
                href="/account"
                title="Il tuo account"
                aria-label={`Il tuo account: ${firstName}`}
                className="relative inline-flex items-center gap-2.5 rounded-full border border-border bg-surface py-1 pl-1 pr-3.5 text-sm font-semibold text-foreground transition-colors hover:border-amber/60"
              >
                <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-amber text-[0.7rem] font-extrabold uppercase leading-none text-on-amber">
                  {firstName.charAt(0)}
                </span>
                <span className="flex flex-col items-start leading-none">
                  <span className="kicker text-[0.52rem]">Account</span>
                  <span className="mt-[3px] max-w-[9rem] truncate">{firstName}</span>
                </span>
                {badge && (
                  <span title={`${unseen} nuove generazioni`} className="absolute -right-1.5 -top-1.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-blocked px-1 text-[0.62rem] font-bold leading-none text-white shadow-[0_0_0_2px_var(--bg)]">
                    {badge}
                  </span>
                )}
              </Link>
            ) : (
              <Link href="/login" className={`${topLinkBase} hover:after:scale-x-100`}>Accedi</Link>
            )}
            <ThemeToggle />
            {/* Chi e' gia' dentro non ha bisogno di entrare nel registro: la sua azione e' generare. */}
            <Button asChild size="sm">
              {firstName ? <Link href="/match">Genera</Link> : <Link href="/entra">Entra nel registro</Link>}
            </Button>
          </div>
        </div>

        {/* Sotto lg (mobile, tablet touch): VOLT compatto + hamburger */}
        <div className="flex items-center gap-2 xl:hidden">
          {firstName && volt !== null && <VoltBadge initial={volt} threshold={voltThreshold} />}
          <ThemeToggle />
          <button
            onClick={() => setOpen(true)}
            aria-label="Apri menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-[var(--hairline)]"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>
    </header>

      {/* Drawer (mobile + tablet): Avatar/Genera diretti + 3 sezioni accordion */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/30 xl:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 flex h-full w-[82%] max-w-xs flex-col border-l border-border bg-surface p-6 shadow-[-20px_0_60px_rgba(23,21,15,0.18)] xl:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="kicker text-foreground">Menu</span>
                <button onClick={() => setOpen(false)} aria-label="Chiudi menu" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-[var(--hairline)] hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
                {NAV.map((entry) =>
                  "items" in entry ? (
                    <div key={entry.label}>
                      <button
                        type="button"
                        onClick={() => setOpenSection(openSection === entry.label ? null : entry.label)}
                        aria-expanded={openSection === entry.label}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-lg font-medium text-foreground transition-colors hover:bg-[var(--hairline)]"
                      >
                        {entry.label}
                        <ChevronDown className={`h-5 w-5 text-muted transition-transform duration-200 ${openSection === entry.label ? "rotate-180" : ""}`} />
                      </button>
                      {openSection === entry.label && (
                        <div className="flex flex-col gap-0.5 pb-1.5 pl-3">
                          {entry.items.map((it) =>
                            "heading" in it ? (
                              <div key={it.heading} className="kicker px-3 pb-0.5 pt-2 text-[0.6rem] text-faint">{it.heading}</div>
                            ) : (
                              <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-base text-muted transition-colors hover:bg-[var(--hairline)] hover:text-foreground">{it.label}</Link>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link key={entry.href} href={entry.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-lg font-medium text-foreground transition-colors hover:bg-[var(--hairline)]">{entry.label}</Link>
                  )
                )}
                <Link href={firstName ? "/account" : "/login"} onClick={() => setOpen(false)}
                  className="mt-1 flex items-center justify-between rounded-lg px-3 py-3 text-lg font-medium text-foreground transition-colors hover:bg-[var(--hairline)]">
                  <span>{firstName ? `Account · ${firstName}` : "Accedi"}</span>
                  {badge && (
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blocked px-1.5 text-xs font-bold text-white">{badge}</span>
                  )}
                </Link>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button asChild variant="primary" size="lg" className="w-full">
                  {firstName
                    ? <Link href="/match" onClick={() => setOpen(false)}>Genera</Link>
                    : <Link href="/entra" onClick={() => setOpen(false)}>Entra nel registro</Link>}
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
