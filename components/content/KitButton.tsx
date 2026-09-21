"use client";

import { useState } from "react";

// KIT CAMPAGNA in un clic: uno zip con i quattro tagli pronti a pubblicare
// (quadrato, verticale, storia, banner), l'originale e la liberatoria scritta.
// Il server ci mette qualche secondo (ritaglia sui volti e rimette il
// certificato dentro ogni file), quindi qui si dice che sta lavorando: un
// <a download> muto sembrerebbe un clic andato a vuoto.
export function KitButton({
  certificate,
  label = "Scarica il kit",
  className = "",
}: {
  certificate: string;
  label?: string;
  className?: string;
}) {
  const [stato, setStato] = useState<"fermo" | "lavoro" | "errore">("fermo");

  async function scarica() {
    setStato("lavoro");
    try {
      const res = await fetch(`/api/content/${certificate}/kit`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `semblic-kit-${certificate.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setStato("fermo");
    } catch {
      setStato("errore");
    }
  }

  return (
    <button
      type="button"
      onClick={scarica}
      disabled={stato === "lavoro"}
      title="Quadrato, verticale, storia e banner, piu' l'originale e la liberatoria"
      className={className}
    >
      {stato === "lavoro" ? "Preparo il kit…" : stato === "errore" ? "Riprova" : label}
    </button>
  );
}
