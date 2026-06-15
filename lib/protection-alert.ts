import { createServerClient } from "@/lib/supabase";

// Alert al TITOLARE di un volto protetto quando qualcuno ne carica la foto su
// /verify (modulo VETO, Fase 2.5). E' il titolare che scopre l'abuso e agisce;
// chi cerca non scopre MAI nulla (invertirlo trasformerebbe lo scudo in uno
// strumento di stalking). Best-effort e fire-and-forget: se la tabella manca,
// nessun crash. MAI dati di chi cerca: solo l'handle protetto e la vicinanza.
export function logProtectionAlert(handle: string, similarity: number, filtered: boolean): void {
  const admin = createServerClient();
  void admin
    .from("protection_alerts")
    .insert({ handle, similarity, filtered })
    .then(({ error }) => {
      if (error) console.warn("[protection_alerts] log fallito:", error.message);
    });
}
