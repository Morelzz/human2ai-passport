"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollProgress } from "@/components/motion/ScrollProgress";

const LINKS = [
  { href: "/catalogo", label: "Catalogo" },
  { href: "/match", label: "Trova un volto" },
  { href: "/pricing", label: "Prezzi" },
  { href: "/trasparenza", label: "Trasparenza" },
  { href: "/blog", label: "Blog" },
];

export function Navbar({ firstName, unseen = 0 }: { firstName: string | null; unseen?: number }) {
  const [open, setOpen] = useState(false);
  const badge = unseen > 0 ? (unseen > 9 ? "9+" : String(unseen)) : null;

  // Nav "viva": oltre la soglia di scroll il vetro si addensa e la barra si
  // restringe (transizione fluida via classi + transition-all).
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

  return (
    <>
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-all duration-500 ${
        scrolled
          ? "border-violet/20 bg-obsidian/90 shadow-[0_8px_40px_rgba(0,0,0,0.45),0_1px_0_rgba(107,33,232,0.25)]"
          : "border-white/[0.06] bg-obsidian/70"
      }`}
    >
      <ScrollProgress />
      <nav className={`mx-auto flex max-w-6xl items-center justify-between px-5 transition-all duration-500 sm:px-8 ${scrolled ? "h-[3.4rem]" : "h-16"}`}>
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-shield.png" alt="" aria-hidden className="h-8 w-8 shrink-0 object-contain [mask-image:radial-gradient(circle,#000_56%,transparent_80%)] [-webkit-mask-image:radial-gradient(circle,#000_56%,transparent_80%)]" />
          <span className="text-sm font-bold tracking-[0.15em]">HUMAN2AI</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="group relative text-sm text-muted transition-colors hover:text-foreground">
              {l.label}
              {/* Underline a gradiente che si disegna all'hover */}
              <span
                aria-hidden
                className="absolute -bottom-1.5 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full transition-transform duration-300 ease-out group-hover:scale-x-100"
                style={{ background: "linear-gradient(90deg,#6B21E8,#B8005C)", boxShadow: "0 0 8px rgba(107,33,232,0.6)" }}
              />
            </Link>
          ))}
          {firstName ? (
            <Link href="/account" className="relative inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3.5 py-1.5 text-sm font-semibold text-foreground">
              <span className="h-4.5 w-4.5 rounded-full bg-[linear-gradient(135deg,#6B21E8,#B8005C)]" />
              {firstName}
              {badge && (
                <span title={`${unseen} nuove generazioni`} className="absolute -right-1.5 -top-1.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-crimson px-1 text-[0.62rem] font-bold leading-none text-white shadow-[0_0_0_2px_rgba(10,10,15,1)]">
                  {badge}
                </span>
              )}
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-muted transition-colors hover:text-foreground">Accedi</Link>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/verify">Verifica</Link>
          </Button>
        </div>

        {/* Mobile: hamburger */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Apri menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-white/5 md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
      </nav>
    </header>

      {/* Drawer mobile */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 flex h-full w-[82%] max-w-xs flex-col border-l border-white/10 bg-[#101018] p-6 shadow-[-20px_0_60px_rgba(0,0,0,0.6)] md:hidden"
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="text-sm font-bold tracking-[0.15em]">MENU</span>
                <button onClick={() => setOpen(false)} aria-label="Chiudi menu" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {LINKS.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-lg font-medium text-foreground transition-colors hover:bg-white/5">
                    {l.label}
                  </Link>
                ))}
                <Link href={firstName ? "/account" : "/login"} onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-3 text-lg font-medium text-foreground transition-colors hover:bg-white/5">
                  <span>{firstName ? `Account · ${firstName}` : "Accedi"}</span>
                  {badge && (
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-crimson px-1.5 text-xs font-bold text-white">{badge}</span>
                  )}
                </Link>
              </div>

              <div className="mt-auto">
                <Button asChild variant="primary" size="lg" className="w-full">
                  <Link href="/verify" onClick={() => setOpen(false)}>Verifica un contenuto</Link>
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
