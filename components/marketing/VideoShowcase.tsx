"use client";

import { HeroVideo } from "./HeroVideo";

// Il video di brand (ex-hero) in una sezione dedicata: cornice hairline a
// raggio 24 sul void, nessuna ombra (sistema Dala ibrido). Il loop con
// dip-to-dark resta dentro HeroVideo.
export function VideoShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="mb-7 text-center">
        <span className="label-mono text-teal">Il registro in movimento</span>
        <h2 className="mt-3 text-balance text-3xl font-extralight tracking-[-0.02em] sm:text-4xl">
          Persone vere, non rendering.
        </h2>
      </div>
      <div className="relative overflow-hidden rounded-[24px] border border-white/10">
        <HeroVideo className="relative aspect-video w-full" />
      </div>
    </section>
  );
}
