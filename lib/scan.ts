import { createServerClient } from "@/lib/supabase";

// H2 — la scansione in studio: prezzo e sedi.
// PREZZO DI LANCIO deciso da Morelz (2026-06-10): 99 € dichiarato come tale.
// Configurabile da env senza toccare il codice (SCAN_PRICE_CENTS).
export const SCAN_PRICE_CENTS = Number(process.env.SCAN_PRICE_CENTS ?? 9900);
export const SCAN_PRICE_LABEL_SUFFIX = "prezzo di lancio";

export interface Sede {
  id: string;
  slug: string;
  name: string;
  city: string;
  lat: number | null;
  lng: number | null;
  status: "attiva" | "in_arrivo";
  booking_enabled: boolean;
}

// Fallback se la migrazione scan_sedi_bookings.sql non è ancora applicata:
// la pagina di booking resta usabile (l'insert dirà onestamente 503).
export const SEDE_FALLBACK: Sede = {
  id: "",
  slug: "void-rimini",
  name: "Studio Void",
  city: "Rimini",
  lat: 44.0598,
  lng: 12.5664,
  status: "attiva",
  booking_enabled: true,
};

// Tutte le sedi (per mappa H4 e booking). Difensivo: tabella assente → fallback.
export async function getSedi(): Promise<Sede[]> {
  const sb = createServerClient();
  const { data, error } = await sb.from("sedi").select("*").order("created_at");
  if (error || !data || data.length === 0) return [SEDE_FALLBACK];
  return data as Sede[];
}
