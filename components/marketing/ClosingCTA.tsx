"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/Magnetic";

// [L'APPELLO], casa nuova: l'ultima isola scura, centrata, con un alone d'ambra
// dal basso. Niente WebGL: il peso va nel titolo.
export function ClosingCTA() {
  return (
    <section className="mx-auto max-w-7xl px-3 pt-20 sm:px-6 sm:pt-24 lg:px-8">
      <motion.div
        data-theme="dark"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="isola flex flex-col items-center gap-5 px-6 py-16 text-center sm:px-12 sm:py-24"
        style={{ background: "radial-gradient(50% 80% at 50% 100%, rgba(226,154,46,0.22), transparent 65%), #0C0F17" }}
      >
        <span className="kicker">L&apos;appello</span>
        <h2 className="max-w-[16ch] text-balance text-[2.4rem] font-bold leading-[0.98] tracking-[-0.04em] sm:text-[4rem]">
          L&apos;epoca dei volti senza nome finisce qui.
        </h2>
        <p className="max-w-[44ch] text-pretty text-[1.02rem] leading-relaxed text-muted sm:text-[1.12rem]">
          Metti il tuo volto nel registro, o proteggilo per sempre. In entrambi i casi, decidi tu.
        </p>
        <Magnetic>
          <Button asChild size="lg"><Link href="/signup">Entra in SEMBLIC</Link></Button>
        </Magnetic>
      </motion.div>
    </section>
  );
}
