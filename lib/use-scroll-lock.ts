import { useEffect } from "react";

// ──────────────────────────────────────────────────────────────────────────
// useScrollLock — blocca lo scroll della pagina di sfondo quando un overlay
// (bottom sheet su mobile, modale su desktop) e aperto.
//
// Il sito usa Lenis (smooth scroll, components/motion/SmoothScroll.tsx) che
// INTERCETTA la rotella a livello globale: `body { overflow: hidden }` da solo
// NON basta, perche Lenis continua a scrollare la pagina via wheel. Quindi:
//  1. fermiamo Lenis (`lenis.stop()`) finche l'overlay e aperto: la pagina
//     dietro resta ferma e la rotella torna nativa;
//  2. mettiamo `overflow:hidden` sul body come cintura (ambienti senza Lenis);
//  3. il contenitore scrollabile dell'overlay deve avere l'attributo
//     `data-lenis-prevent` (gestito nel markup) cosi la rotella ci scorre dentro
//     in modo nativo anche se Lenis fosse attivo.
// Alla chiusura si riavvia Lenis e si ripristina l'overflow.
// ──────────────────────────────────────────────────────────────────────────

type LenisLike = { stop?: () => void; start?: () => void };

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
    lenis?.stop?.();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      lenis?.start?.();
      document.body.style.overflow = prev;
    };
  }, [active]);
}
