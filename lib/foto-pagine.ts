// ──────────────────────────────────────────────────────────────────────────
// LE COPERTINE DELLE PAGINE (27/9/2026, notte). Ogni pagina apre su uno scatto
// VERO di Semblic: pagato, con il suo certificato e la parte andata alle
// persone (numeri letti dal database il giorno della scelta, generati da
// .tmp/esporta-pagine.mjs). Rifatte tutte il 27/9 col motore di oggi (luce e
// vestiti scelti), una persona diversa per quasi ogni pagina. Le foto stanno in public/pagine/<chiave>-<w>.webp.
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
  "catalogo": { certificato: "68b6323b83af422306aa8e211c1ceab399bd0b1b83509031e397900195246f1b", persone: [{"handle":"greta","alias":"Greta"},{"handle":"veronica","alias":"Veronica"},{"handle":"candies","alias":"Candies"}], grossCents: 100, royaltyCents: 22, larghezza: 1536, altezza: 1024, fuoco: "50% 30%" },
  "prezzi": { certificato: "ec91612a3919d393897541f4d8f1445d793a5ef97dcd4ffd5e95b151181c318a", persone: [{"handle":"chiara","alias":"Chiara"}], grossCents: 50, royaltyCents: 11, larghezza: 1536, altezza: 1024, fuoco: "52% 36%" },
  "ward": { certificato: "f5050fd8dcdc870c42d769a913dce109ffb2c79f30bbab3e8456b4d79d14f663", persone: [{"handle":"asia","alias":"Asia"}], grossCents: 50, royaltyCents: 11, larghezza: 1024, altezza: 1536, fuoco: "50% 20%" },
  "verify": { certificato: "ac0ea7f6c554d8d5b268ed8ebdf6ee1b1f447adc544ab05a8cb9889c2f76d2d1", persone: [{"handle":"claire","alias":"Claire"}], grossCents: 50, royaltyCents: 11, larghezza: 1536, altezza: 1024, fuoco: "50% 32%" },
  "entra": { certificato: "13cd5ae2d5856f0c554b99dbedf6555b3c6c84034e19ce6c20b7412c0b8609ef", persone: [{"handle":"greta","alias":"Greta"}], grossCents: 50, royaltyCents: 11, larghezza: 1024, altezza: 1536, fuoco: "55% 22%" },
  "sviluppatori": { certificato: "22ad8bc9e5e5361fbe4b0b8de561061655c7013b818b7db87f5ce1b0f0522b09", persone: [{"handle":"candies","alias":"Candies"}], grossCents: 50, royaltyCents: 11, larghezza: 1024, altezza: 1536, fuoco: "45% 25%" },
  "enterprise": { certificato: "198ef9075f9b292d0f6c530be7c21255a0c8463681ed780b5b4d7c2d35b61b94", persone: [{"handle":"alessia","alias":"Alessia"}], grossCents: 42, royaltyCents: 9, larghezza: 1024, altezza: 1024, fuoco: "50% 22%" },
  "studio": { certificato: "4c9def922baea1f811e4be13b5afba72f3605e162dd2967f8a16b6f8db927086", persone: [{"handle":"veronica","alias":"Veronica"}], grossCents: 50, royaltyCents: 11, larghezza: 1536, altezza: 1024, fuoco: "50% 28%" },
  "academy": { certificato: "4221f533a4dec543bf89e7c310a540cd4825bddba516a1f811399743a2d8ac13", persone: [{"handle":"stella","alias":"Stella"}], grossCents: 42, royaltyCents: 9, larghezza: 1024, altezza: 1024, fuoco: "45% 25%" },
  "partner": { certificato: "4f5cf3ec81716e0d12148f7128af062187e3547d3499dd3bb8c2f4f2b2845af3", persone: [{"handle":"random","alias":"Random"}], grossCents: 50, royaltyCents: 11, larghezza: 1024, altezza: 1536, fuoco: "50% 14%" },
  "tutela": { certificato: "fb182e5f0de67406293a47bd905a0743e7494f7585bbd71e33b57c2e4c8dc240", persone: [{"handle":"gabriella","alias":"Gabriella"}], grossCents: 50, royaltyCents: 11, larghezza: 1024, altezza: 1536, fuoco: "45% 18%" },
  "scansione": { certificato: "2f8e4238510e5f0cbae695bf78020f113fd9cce7a23296407dc0ce2723252de2", persone: [{"handle":"chiara","alias":"Chiara"}], grossCents: 50, royaltyCents: 11, larghezza: 1024, altezza: 1536, fuoco: "50% 16%" },
  "contatti": { certificato: "c9acd43f499f983fd2dcf1e1ead52346c79e7cde2f1da789aba359943b9ce88d", persone: [{"handle":"asia","alias":"Asia"}], grossCents: 50, royaltyCents: 11, larghezza: 1024, altezza: 1536, fuoco: "50% 20%" },
  "divisa": { certificato: "1353c6027be817d41367d98fbd5d02ba651c19e1f5c3d010ec56b7afba808e44", persone: [{"handle":"alessia","alias":"Alessia"}], grossCents: 50, royaltyCents: 11, larghezza: 1536, altezza: 1024, fuoco: "50% 26%" },
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
