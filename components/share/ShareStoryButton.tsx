"use client";

import { useState } from "react";

// Bottone "Condividi come Storia" — scarica la cornice-certificato 1080×1920
// dal server (/api/share-story) e la consegna al menu di condivisione nativo
// (Web Share API livello 2, con file): su telefono l'utente sceglie Instagram
// e la Storia parte già incorniciata. Dove i file non si possono condividere
// (desktop, browser vecchi) → download diretto dello stesso PNG.
// La cornice è l'UNICO formato che esce da questo flusso: condividere = condividere
// col certificato. Mai l'immagine nuda.
export function ShareStoryButton({
  query,
  filename = "human2ai-story.png",
  label = "Condividi come Storia",
  className = "",
}: {
  query: string; // querystring per /api/share-story, es. "cert=…&v=buyer"
  filename?: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/share-story?${query}`);
      if (!res.ok) throw new Error(`render ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });

      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
        } catch (e) {
          // L'utente ha chiuso il menu di condivisione: non è un errore.
          if ((e as Error).name !== "AbortError") throw e;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError("Condivisione non riuscita. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={share} disabled={busy} className={className}>
        {busy ? "Preparo la Storia…" : label}
      </button>
      {error && (
        <p role="status" className="mt-1 text-[0.7rem] text-crimson">
          {error}
        </p>
      )}
    </>
  );
}
