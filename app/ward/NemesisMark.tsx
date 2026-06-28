// Icona di Nemesis (lo strike): un mirino colpito, taglio diagonale. SVG vera,
// niente emoji. Eredita colore (currentColor) e misura (className). Famiglia
// Ward/Nemesis/Sigil: questo e' il segno dell'esecuzione mirata.
export function NemesisMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 1.5V5M12 19v3.5M1.5 12H5M19 12h3.5" />
      <path d="M7.6 16.4L16.4 7.6" />
    </svg>
  );
}
