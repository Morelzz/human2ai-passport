"use client";

import { useEffect, useState } from "react";

// ── Barra di condivisione social per gli articoli del blog ──
// Client component: usa window.location per l'URL corrente.
// Niente SDK esterni: solo share-intent URL (zero tracker, zero peso).

function shareUrl(): string {
  return typeof window !== "undefined" ? window.location.href : "";
}

const BTN =
  "inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-bold tracking-wide text-muted transition-colors hover:border-white/25 hover:text-foreground";

export function ShareBar({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  // La share nativa esiste solo nel browser: deciderlo dopo il mount
  // evita differenze tra render server e client (hydration).
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const open = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=520");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard non disponibile: ignora */
    }
  };

  // Condivisione nativa (mobile): un solo tasto di sistema, se disponibile.
  const nativeShare = async () => {
    try {
      await navigator.share({ title, url: shareUrl() });
    } catch {
      /* annullato dall'utente */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label-mono mr-1 text-faint">CONDIVIDI</span>
      <button
        type="button"
        className={BTN}
        onClick={() =>
          open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl())}`)
        }
      >
        X
      </button>
      <button
        type="button"
        className={BTN}
        onClick={() =>
          open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl())}`)
        }
      >
        LinkedIn
      </button>
      <button
        type="button"
        className={BTN}
        onClick={() =>
          open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}`)
        }
      >
        Facebook
      </button>
      <button
        type="button"
        className={BTN}
        onClick={() =>
          open(`https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl()}`)}`)
        }
      >
        WhatsApp
      </button>
      <button type="button" className={BTN} onClick={copy}>
        {copied ? "Copiato ✓" : "Copia link"}
      </button>
      {canNativeShare && (
        <button type="button" className={BTN} onClick={nativeShare}>
          Altro…
        </button>
      )}
    </div>
  );
}
