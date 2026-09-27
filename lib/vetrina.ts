// ──────────────────────────────────────────────────────────────────────────
// LO SCATTO IN VETRINA (27/9/2026). La prima pagina non racconta, mostra: uno
// scatto certificato VERO, con il suo prezzo e quello che ha preso la persona.
// Qui si leggono i numeri dal database (mai scritti a mano) e il consenso vivo
// della persona: se ha revocato, le sue foto escono dalla prima pagina da sole
// (torna null e la pagina mostra le due porte senza foto).
//
// Lo scatto: Gabriella al caffe', orizzontale, alta qualita', fatto il 27/9
// con l'account di prova e pagato come ogni altro (certificato d20b966b1352).
// Le foto pubbliche stanno in public/home/ (senza filigrana visibile dal 27/9).
// SERVER-ONLY.
// ──────────────────────────────────────────────────────────────────────────

import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { TAG_REGISTRO } from "@/lib/registro-cache";

export const CERTIFICATO_VETRINA = "d20b966b1352";

export interface ScattoVetrina {
  certificato: string; // intero, per il link a Sigil
  handle: string;
  nome: string;
  prezzoCent: number; // quanto ha pagato chi l'ha creato
  allaPersonaCent: number; // quanto e' andato alla persona
  formato: "orizzontale" | "verticale" | "quadrato";
  qualita: "bozza" | "alta" | "stampa";
  consensoDal: string | null; // AAAA-MM-GG, il giorno del si'
}

function formatoDa(size: string | null | undefined): ScattoVetrina["formato"] {
  const [w, h] = String(size ?? "").split("x").map(Number);
  if (!w || !h || w === h) return "quadrato";
  return w > h ? "orizzontale" : "verticale";
}

/** Pura: dalla riga del database a quello che mostra la pagina, o null se non si puo' mostrare. */
export function vetrinaDa(
  gen: { certificate: string | null; gross_cents: number | null; royalty_cents: number | null } | null,
  avatar: { handle: string; alias: string; revoked_at: string | null; commercial_consent: boolean | null; verification_status?: string | null; protection_only?: boolean | null; consent_start?: string | null } | null,
  job: { echoSize?: string | null; echoQuality?: string | null } | null,
): ScattoVetrina | null {
  if (!gen?.certificate || gen.gross_cents == null || gen.royalty_cents == null || !avatar) return null;
  // Solo con il consenso vivo: una revoca toglie la persona dalla vetrina subito.
  if (avatar.revoked_at || avatar.commercial_consent === false) return null;
  if (avatar.protection_only || (avatar.verification_status && avatar.verification_status !== "approved")) return null;
  const q = job?.echoQuality === "high" ? (Number(String(job?.echoSize).split("x")[0]) > 2000 ? "stampa" : "alta") : "bozza";
  return {
    certificato: gen.certificate,
    handle: avatar.handle,
    nome: avatar.alias,
    prezzoCent: gen.gross_cents,
    allaPersonaCent: gen.royalty_cents,
    formato: formatoDa(job?.echoSize),
    qualita: q,
    consensoDal: avatar.consent_start ? String(avatar.consent_start).slice(0, 10) : null,
  };
}

export const scattoInVetrina = unstable_cache(
  async (): Promise<ScattoVetrina | null> => {
    try {
      const sb = createServerClient();
      const { data: gen } = await sb
        .from("generations")
        .select("certificate, gross_cents, royalty_cents, avatar_id")
        .like("certificate", `${CERTIFICATO_VETRINA}%`)
        .maybeSingle();
      if (!gen) return null;
      const [{ data: avatar }, { data: job }] = await Promise.all([
        sb.from("avatars").select("handle, alias, revoked_at, commercial_consent, verification_status, protection_only, consent_start").eq("id", gen.avatar_id).maybeSingle(),
        sb.from("generation_jobs").select("params").eq("certificate", gen.certificate).maybeSingle(),
      ]);
      const p = (job?.params ?? null) as { echoSize?: string; echoQuality?: string } | null;
      return vetrinaDa(gen, avatar, p);
    } catch {
      return null;
    }
  },
  ["scatto-in-vetrina"],
  { tags: [TAG_REGISTRO], revalidate: 300 },
);
