// ──────────────────────────────────────────────────────────────────────────
// LE COPERTINE DELLE PAGINE (27/9/2026, notte). Ogni pagina apre su uno scatto
// VERO di Semblic: pagato, con il suo certificato e la parte andata alle
// persone (numeri letti dal database il giorno della scelta, generati da
// .tmp/esporta-pagine.mjs). Le foto stanno in public/pagine/<chiave>-<w>.webp.
//
// Come la vetrina della prima pagina: prima di mostrarle si legge il consenso
// VIVO di chi c'e' dentro. Se una persona revoca, la sua foto esce dal sito da
// sola e la pagina apre senza foto (fotoPagina torna null). SERVER-ONLY.
// ──────────────────────────────────────────────────────────────────────────

import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { TAG_REGISTRO } from "@/lib/registro-cache";

export interface FotoPagina {
  certificato: string;
  persone: { handle: string; alias: string }[];
  grossCents: number;
  royaltyCents: number;
  larghezza: number;
  altezza: number;
  fuoco: string; // object-position, sul volto
}

export const FOTO_PAGINE = {
  "catalogo": { certificato: "a7d5377da2c518fb10019c5e11152a2350b62e457e66901258ce38e8ffa29c63", persone: [{"handle":"alessia","alias":"Alessia"},{"handle":"asia","alias":"Asia"},{"handle":"random","alias":"Random"}], grossCents: 100, royaltyCents: 22, larghezza: 1536, altezza: 1024, fuoco: "50% 35%" },
  "prezzi": { certificato: "22bcaa7cc65aa947e33be1673eb095009af6aa10ece0a22b82b9b46eecf23dac", persone: [{"handle":"gabriella","alias":"Gabriella"},{"handle":"stella","alias":"Stella"}], grossCents: 100, royaltyCents: 22, larghezza: 1536, altezza: 1024, fuoco: "50% 30%" },
  "proteggi": { certificato: "b778fde6ea0697811458ea8fef8f3f47b161965023900e7686aab3f7d957410a", persone: [{"handle":"asia","alias":"Asia"}], grossCents: 36, royaltyCents: 24, larghezza: 1024, altezza: 1024, fuoco: "50% 28%" },
  "ward": { certificato: "f2190ed61cb51989b18ff61598e70d78f63eeeb909a2d01815a8281a77e2701a", persone: [{"handle":"gabriella","alias":"Gabriella"}], grossCents: 36, royaltyCents: 24, larghezza: 1024, altezza: 1024, fuoco: "50% 25%" },
  "verify": { certificato: "c6fb19b7c234b408548416c3d5a2779bafb8df0f42d123348a0b488c988f72de", persone: [{"handle":"gabriella","alias":"Gabriella"},{"handle":"stella","alias":"Stella"}], grossCents: 100, royaltyCents: 22, larghezza: 1536, altezza: 1024, fuoco: "50% 35%" },
  "entra": { certificato: "c4468df76b3478a35ab3d45000793b98e1330ce5c55d9d204a289aca7a546ae6", persone: [{"handle":"gabriella","alias":"Gabriella"}], grossCents: 50, royaltyCents: 11, larghezza: 1024, altezza: 1536, fuoco: "50% 28%" },
  "signup": { certificato: "f6d5c88e820d3ee6e10f55e44b210f1e634f0a72ba6f2bd82680cedbd1f9d863", persone: [{"handle":"chiara","alias":"Chiara"}], grossCents: 50, royaltyCents: 11, larghezza: 1024, altezza: 1536, fuoco: "50% 30%" },
  "login": { certificato: "40128d9304d3d26a50fe98c0ff3d9c359c3de7ebd2a9ee56a9a94330d64ad730", persone: [{"handle":"stella","alias":"Stella"}], grossCents: 12, royaltyCents: 4, larghezza: 1024, altezza: 1024, fuoco: "50% 30%" },
  "sviluppatori": { certificato: "f0622c1081e97f6123a532b60e65e34c1f9bd6da3a3f610262bee3a89efe9546", persone: [{"handle":"claire","alias":"Claire"}], grossCents: 37, royaltyCents: 24, larghezza: 1024, altezza: 1536, fuoco: "50% 30%" },
  "enterprise": { certificato: "256564a167718b34d757c92ec8bed1b0d7210e306df6f001a89d51cb9d3f4199", persone: [{"handle":"claire","alias":"Claire"}], grossCents: 36, royaltyCents: 24, larghezza: 1024, altezza: 1024, fuoco: "50% 35%" },
  "studio": { certificato: "d22d284d8a539138725eafd2dfd7ff7b76b7cee998db4855ddc3b00ed4449eef", persone: [{"handle":"random","alias":"Random"}], grossCents: 120, royaltyCents: 96, larghezza: 2560, altezza: 1440, fuoco: "60% 30%" },
  "academy": { certificato: "e58286c485e753a801cccb419596beb20f9d3653a489036fbf0649306021e3ae", persone: [{"handle":"random","alias":"Random"}], grossCents: 21, royaltyCents: 6, larghezza: 1024, altezza: 1024, fuoco: "50% 25%" },
  "partner": { certificato: "5b6f2b87574063e9cf16015c363f91f61959b65035619297fd6fe604b0adcfda", persone: [{"handle":"random","alias":"Random"}], grossCents: 70, royaltyCents: 24, larghezza: 1024, altezza: 1536, fuoco: "50% 30%" },
  "tutela": { certificato: "abb06d3d3159f11b6bb16e1550545a29751229d3fbc87f45a19d1e7e8711f8bc", persone: [{"handle":"asia","alias":"Asia"}], grossCents: 36, royaltyCents: 24, larghezza: 1024, altezza: 1024, fuoco: "50% 25%" },
  "scansione": { certificato: "e9851b6244184ab03d1db523202ef81783352bf7fa9b279b92dc7827150d66a3", persone: [{"handle":"claire","alias":"Claire"}], grossCents: 37, royaltyCents: 24, larghezza: 1024, altezza: 1536, fuoco: "50% 35%" },
  "contatti": { certificato: "c4e8251e0ef82de67b1339167c90524d4e6a91f4ad0536a3a960c7b214e82048", persone: [{"handle":"alessia","alias":"Alessia"}], grossCents: 37, royaltyCents: 24, larghezza: 1024, altezza: 1536, fuoco: "50% 30%" },
  "apocalisse": { certificato: "5a3b489baff0927e1ce724a3f01e3527f13e03b2d563ac86c592e6f236822aad", persone: [{"handle":"gabriella","alias":"Gabriella"},{"handle":"stella","alias":"Stella"}], grossCents: 100, royaltyCents: 22, larghezza: 1536, altezza: 1024, fuoco: "50% 30%" },
} satisfies Record<string, FotoPagina>;

export type ChiaveFoto = keyof typeof FOTO_PAGINE;

export interface CopertinaPagina extends FotoPagina {
  chiave: ChiaveFoto;
  src960: string;
  src1600: string;
}

/** Pura: la copertina se tutte le persone dentro hanno ancora il consenso, se no null. */
export function copertinaDa(chiave: ChiaveFoto, vivi: Set<string>): CopertinaPagina | null {
  const f = FOTO_PAGINE[chiave];
  if (!f || !f.persone.every((p) => vivi.has(p.handle))) return null;
  return { ...f, chiave, src960: `/pagine/${chiave}-960.webp`, src1600: `/pagine/${chiave}-1600.webp` };
}

// Chi ha il consenso commerciale vivo, fra le persone delle copertine.
const consensiVivi = unstable_cache(
  async (): Promise<string[]> => {
    const handles = [...new Set(Object.values(FOTO_PAGINE).flatMap((f) => f.persone.map((p) => p.handle)))];
    const { data, error } = await createServerClient()
      .from("avatars")
      .select("handle, revoked_at, commercial_consent, verification_status, protection_only")
      .in("handle", handles);
    if (error) throw error; // niente cache di un errore: al prossimo giro si riprova
    return (data ?? [])
      .filter((a) => !a.revoked_at && a.commercial_consent !== false && a.verification_status === "approved" && !a.protection_only)
      .map((a) => a.handle);
  },
  ["copertine-consensi"],
  { tags: [TAG_REGISTRO], revalidate: 300 },
);

export async function fotoPagina(chiave: ChiaveFoto): Promise<CopertinaPagina | null> {
  try {
    return copertinaDa(chiave, new Set(await consensiVivi()));
  } catch {
    return null; // senza la lettura del consenso, nessuna foto: si apre senza
  }
}
