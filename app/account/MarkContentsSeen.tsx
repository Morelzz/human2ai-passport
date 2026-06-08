"use client";

import { useEffect } from "react";

// Al montaggio della pagina account segna "viste" le generazioni (cookie):
// così il badge "+N" nella nav si azzera dopo che l'utente le ha guardate.
export function MarkContentsSeen() {
  useEffect(() => {
    fetch("/api/contents/seen", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
