"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/Magnetic";
import { KineticText } from "@/components/motion/KineticText";

// [CTA FINALE] — Chiusura pagina. Campo di particelle WebGL nel void (ondata
// GSAP/Three.js), aurora viva, tipografia oversize cinetica, CTA magnetica.
// Copy verbatim da docs/SITE_COPY.md.

// Chunk three.js separato, mai in SSR: si monta solo quando la CTA si avvicina.
const VoidField = dynamic(() => import("@/components/three/VoidField"), { ssr: false });

export function ClosingCTA() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setNearViewport(true);
          io.disconnect(); // una volta caricato, resta
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="mx-auto max-w-5xl px-5 pb-24 pt-8 sm:px-8 sm:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative overflow-hidden rounded-[2rem] px-6 py-20 text-center sm:px-12 sm:py-28"
      >
        {/* Aurora viva dentro la card (due bagliori che respirano in alternanza) */}
        <motion.div
          aria-hidden
          className="absolute -left-1/4 -top-1/2 h-[120%] w-[80%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(238,122,112,0.28), transparent 65%)" }}
          animate={reduce ? undefined : { x: ["0%", "30%", "0%"], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -right-1/4 -bottom-1/2 h-[120%] w-[80%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(242,169,59,0.30), transparent 65%)" }}
          animate={reduce ? undefined : { x: ["0%", "-30%", "0%"], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        {/* Void field: l'onda di particelle WebGL sotto il contenuto, sfumata ai bordi */}
        {nearViewport && !reduce && (
          <VoidField className="absolute inset-0 opacity-70 [mask-image:radial-gradient(85%_75%_at_50%_45%,#000_45%,transparent_100%)] [-webkit-mask-image:radial-gradient(85%_75%_at_50%_45%,#000_45%,transparent_100%)]" />
        )}

        {/* Filo di luce perimetrale in alto */}
        <div aria-hidden className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <div className="relative">
          <span className="label-mono text-crimson-light">L&apos;appello</span>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
            {/* Lo spazio tra segmenti va FUORI da KineticText (vedi nota nel
                componente): dentro `text` viene perso → "nomefinisce". */}
            <KineticText text="L'epoca dei volti senza nome" />{" "}
            <KineticText text="finisce qui" gradient delay={0.35} />
            <KineticText text="." delay={0.45} />
          </h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Unisciti alle persone che hanno deciso di possedere la propria immagine nell&apos;era dell&apos;AI.
          </p>
          <div className="mt-10 flex justify-center">
            <Magnetic>
              <Button asChild size="lg">
                <Link href="/signup">Entra in SEMBLIC</Link>
              </Button>
            </Magnetic>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
