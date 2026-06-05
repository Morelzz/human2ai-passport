"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function ClosingCTA() {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-24 pt-8 sm:px-8 sm:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-12 sm:py-20"
      >
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(107,33,232,0.22),transparent_70%)]" />
        <div className="relative">
          <h2 className="text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Il tuo volto è <span className="text-gradient">tuo</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Rivendicalo nel registro. Decidi come può essere usato. Vieni pagato ogni volta.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link href="/signup">Rivendica il tuo volto</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
