"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { TIER_CONFIG, Tier } from "@/lib/types";

export interface FeaturedAvatar {
  handle: string;
  alias: string;
  portrait_url: string | null;
  tier: Tier;
  usage_count: number;
  revoked_at: string | null;
}

// Il ritratto reale di Mario passa dalla route interna; gli altri usano il portrait.
function imageFor(a: FeaturedAvatar): string | null {
  if (a.handle === "mario-r") return "/api/sample/mario-r/0";
  return a.portrait_url;
}

export function Registry({ avatars, total }: { avatars: FeaturedAvatar[]; total: number }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-faint">VOLTI IN EVIDENZA</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Persone reali, già nel registro.</h2>
        </div>
        <Link href="/match" className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-violet-light hover:underline sm:inline-flex">
          Esplora tutti i {total} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Carosello scroll-snap */}
      <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {avatars.map((a, i) => {
          const tier = TIER_CONFIG[a.tier];
          const src = imageFor(a);
          return (
            <motion.div
              key={a.handle}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: Math.min(i, 5) * 0.06 }}
              className="snap-start shrink-0"
            >
              <Link
                href={`/passport/${a.handle}`}
                className="group block w-[68vw] max-w-[260px] overflow-hidden rounded-2xl border border-white/8 bg-obsidian-2 transition-colors hover:border-white/20 sm:w-[240px]"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-obsidian-3">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={a.alias} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl">👤</div>
                  )}
                  <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.7),transparent_55%)]" />
                  {a.revoked_at && (
                    <span className="absolute right-3 top-3 rounded-full border border-crimson/40 bg-black/50 px-2 py-0.5 text-[0.62rem] font-bold text-crimson backdrop-blur">REVOCATO</span>
                  )}
                  <div className="absolute inset-x-3 bottom-3">
                    <p className="text-base font-bold text-white">{a.alias}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[0.62rem] font-bold" style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.color}55` }}>{tier.label}</span>
                      <span className="text-[0.7rem] text-white/55">{a.usage_count.toLocaleString("it-IT")} utilizzi</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}

        {/* Card finale: esplora tutti */}
        <Link
          href="/match"
          className="flex w-[68vw] max-w-[260px] shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition-colors hover:border-violet/40 hover:bg-violet/5 sm:w-[240px]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-violet/30 bg-violet/10">
            <ArrowRight className="h-5 w-5 text-violet-light" />
          </span>
          <span className="text-sm font-semibold text-foreground">Esplora tutti i {total} volti</span>
          <span className="text-xs text-muted">Cerca per tier, categoria, caratteristiche</span>
        </Link>
      </div>
    </section>
  );
}
