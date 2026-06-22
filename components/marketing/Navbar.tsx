"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { VoltBadge } from "@/components/volt/VoltBadge";
import { ThemeToggle } from "@/components/ThemeToggle";

// Menu (QA device): Avatar e Genera sono il CORE del sistema -> voci DIRETTE
// sempre visibili; il resto raggruppato in 3 tendine. UNA struttura per desktop
// (dropdown hover) e hamburger (sezioni accordion).
type NavEntry =
  | { label: string; href: string }
  | { label: string; items: { href: string; label: string }[] };

const NAV: NavEntry[] = [
  { label: "Avatar", href: "/catalogo" },
  { label: "Genera", items: [
    { href: "/match", label: "Genera" },
    { href: "/studio/edit", label: "Semblic Editor" },
  ] },
  { label: "Il tuo volto", items: [
    { href: "/scansione", label: "Scansione" },
    { href: "/signup/avatar", label: "Proteggi" },
    { href: "/ward", label: "Ward" },
  ] },
  { label: "Aziende", items: [
    { href: "/studio", label: "Studio" },
    { href: "/enterprise", label: "Enterprise" },
  ] },
  { label: "Risorse", items: [
    { href: "/academy", label: "Academy" },
    { href: "/blog", label: "Blog" },
    { href: "/prezzi", label: "Prezzi" },
    { href: "/trasparenza", label: "Trasparenza" },
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

  // Stile condiviso delle voci di primo livello (desktop).
  const topLinkCls = "text-sm tracking-[0.021em] text-muted transition-colors hover:text-foreground";

  return (
    <>
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-all duration-500 ${
        scrolled
          ? "border-violet/20 bg-[var(--nav-bg-scrolled)] shadow-[0_8px_40px_rgba(0,0,0,0.45),0_1px_0_rgba(242,169,59,0.25)]"
          : "border-white/[0.06] bg-[var(--nav-bg)]"
      }`}
    >
      <ScrollProgress />
      <nav className={`mx-auto flex max-w-6xl items-center justify-between px-5 transition-all duration-500 sm:px-8 ${scrolled ? "h-[3.4rem]" : "h-16"}`}>
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-shield.png" alt="" aria-hidden className="h-8 w-8 shrink-0 object-contain [mask-image:radial-gradient(circle,#000_56%,transparent_80%)] [-webkit-mask-image:radial-gradient(circle,#000_56%,transparent_80%)]" />
          <span className="text-sm font-bold tracking-[0.2em]">SEMBLIC</span>
        </Link>

        {/* Desktop (lg+): Avatar/Genera diretti + 3 tendine HOVER. La tendina apre
            al passaggio del cursore (incluso il pannello, grazie al ponte pt-3) e
            si chiude appena esci. Il click col mouse fa blur del bottone (e.detail
            > 0) cosi' NON resta "incollata"; il focus da tastiera (e.detail = 0)
            resta accessibile via group-focus-within. */}
        <div className="hidden items-center gap-6 lg:flex">
          {NAV.map((entry) =>
            "items" in entry ? (
              <div key={entry.label} className="group relative">
                <button
                  type="button"
                  aria-haspopup="true"
                  onClick={(e) => { if (e.detail) e.currentTarget.blur(); }}
                  className={`flex items-center gap-1 ${topLinkCls} group-focus-within:text-foreground`}
                >
                  {entry.label}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
                </button>
                <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="flex min-w-[11rem] flex-col gap-0.5 rounded-2xl border border-white/10 bg-[var(--elevated)] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                    {entry.items.map((it) => (
                      <Link key={it.href} href={it.href} className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-[var(--hairline)] hover:text-foreground">{it.label}</Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link key={entry.href} href={entry.href} className={topLinkCls}>{entry.label}</Link>
            )
          )}
          {firstName && volt !== null && <VoltBadge initial={volt} threshold={voltThreshold} />}
          {firstName ? (
            <Link
              href="/account"
              title="Il tuo account"
              aria-label={`Il tuo account: ${firstName}`}
              className="relative inline-flex items-center gap-2.5 rounded-full border border-violet/30 bg-violet/10 py-1 pl-1 pr-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-violet/20"
            >
              <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-amber text-[0.7rem] font-extrabold uppercase leading-none text-on-amber">
                {firstName.charAt(0)}
              </span>
              <span className="flex flex-col items-start leading-none">
                <span className="text-[0.52rem] font-bold uppercase tracking-[0.16em] text-violet-light">Account</span>
                <span className="mt-[3px] max-w-[9rem] truncate">{firstName}</span>
              </span>
              {badge && (
                <span title={`${unseen} nuove generazioni`} className="absolute -right-1.5 -top-1.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-crimson px-1 text-[0.62rem] font-bold leading-none text-white shadow-[0_0_0_2px_rgba(12,15,23,1)]">
                  {badge}
                </span>
              )}
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-muted transition-colors hover:text-foreground">Accedi</Link>
          )}
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/verify">Sigil</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup/avatar">Proteggiti</Link>
          </Button>
        </div>

        {/* Sotto lg (mobile, tablet touch): VOLT compatto + hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
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
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 flex h-full w-[82%] max-w-xs flex-col border-l border-white/10 bg-[var(--elevated)] p-6 shadow-[-20px_0_60px_rgba(0,0,0,0.6)] lg:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-sm font-bold tracking-[0.15em]">MENU</span>
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
                          {entry.items.map((it) => (
                            <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-base text-muted transition-colors hover:bg-[var(--hairline)] hover:text-foreground">{it.label}</Link>
                          ))}
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
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-crimson px-1.5 text-xs font-bold text-white">{badge}</span>
                  )}
                </Link>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button asChild variant="primary" size="lg" className="w-full">
                  <Link href="/signup/avatar" onClick={() => setOpen(false)}>Proteggiti</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href="/verify" onClick={() => setOpen(false)}>Verifica con Sigil</Link>
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
