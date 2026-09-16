"use client";

import { useState } from "react";

// <img> che, se il file non si carica (sparito dallo storage, link scaduto),
// mostra un segnaposto sobrio invece dell'icona rotta o del testo alt.
// Utile nelle pagine server che elencano contenuti generati.
export function ImmagineSicura({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  const [rotta, setRotta] = useState(false);
  if (rotta) {
    return (
      <div className={`flex items-center justify-center bg-[var(--hairline)] px-4 text-center text-[0.75rem] text-faint ${className}`}>
        Anteprima non disponibile
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setRotta(true)} className={className} />;
}
