"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/match", label: "Trova un volto" },
  { href: "/pricing", label: "Prezzi" },
  { href: "/trasparenza", label: "Trasparenza" },
];

export function Navbar({ firstName }: { firstName: string | null }) {
  const [open, setOpen] = useState(false);

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
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-obsidian/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-shield.png" alt="" aria-hidden className="h-8 w-8 shrink-0 object-contain [mask-image:radial-gradient(circle,#000_56%,transparent_80%)] [-webkit-mask-image:radial-gradient(circle,#000_56%,transparent_80%)]" />
          <span className="text-sm font-bold tracking-[0.15em]">HUMAN2AI</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-muted transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
          {firstName ? (
            <Link href="/account" className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3.5 py-1.5 text-sm font-semibold text-foreground">
              <span className="h-4.5 w-4.5 rounded-full bg-[linear-gradient(135deg,#6B21E8,#B8005C)]" />
              {firstName}
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
              className="fixed right-0 top-0 z-50 flex h-full w-[82%] max-w-xs flex-col border-l border-white/10 bg-obsidian-2/95 p-6 backdrop-blur-xl md:hidden"
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
                  className="rounded-lg px-3 py-3 text-lg font-medium text-foreground transition-colors hover:bg-white/5">
                  {firstName ? `Account · ${firstName}` : "Accedi"}
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
    </header>
  );
}
