// ──────────────────────────────────────────────────────────────────────────
// INVITA UN AMICO, lato server. Le regole stanno in lib/invito (pure): qui c'e'
// solo il pezzo che tocca il database. SERVER-ONLY.
//
// Niente si accredita da solo: i premi li scrive il server quando Stripe
// conferma una ricarica REALE, e ogni accredito ha la sua chiave (il ref del
// movimento VOLT), cosi' un webhook ripetuto non paga due volte.
//
// Finche' supabase/inviti.sql non e' applicato, tutto qui dentro risponde
// "non pronto" e il sito non se ne accorge.
// ──────────────────────────────────────────────────────────────────────────

import { createServerClient } from "@/lib/supabase";
import { grantVolt } from "@/lib/volt";
import { codicePulito, nuovoCodice, premiDaRicarica, scadenza } from "@/lib/invito";

export const COOKIE_INVITO = "semblic_invito";

type Admin = ReturnType<typeof createServerClient>;

/** Il codice dell'utente, creato al primo bisogno. null = tabella non pronta. */
export async function codicePerUtente(userId: string, admin: Admin = createServerClient()): Promise<string | null> {
  const { data, error } = await admin.from("profiles").select("invite_code").eq("id", userId).maybeSingle();
  if (error) return null; // colonna non ancora aggiunta
  if (data?.invite_code) return data.invite_code as string;

  // Fino a cinque tentativi: il codice e' corto, una collisione e' possibile.
  for (let i = 0; i < 5; i++) {
    const c = nuovoCodice();
    const { error: e } = await admin.from("profiles").update({ invite_code: c }).eq("id", userId);
    if (!e) return c;
  }
  return null;
}

/** Chi c'e' dietro un codice. */
export async function utenteDelCodice(codice: string, admin: Admin = createServerClient()): Promise<string | null> {
  const c = codicePulito(codice);
  if (!c) return null;
  const { data, error } = await admin.from("profiles").select("id").eq("invite_code", c).maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}

/**
 * Lega un account nuovo a chi l'ha invitato. Si fa UNA volta sola, subito dopo
 * la registrazione. Ritorna false senza far rumore se il codice non esiste, se
 * e' il proprio, o se questo account era gia' stato invitato da qualcuno.
 */
export async function agganciaInvito(invitatoId: string, codice: string, admin: Admin = createServerClient()): Promise<boolean> {
  const c = codicePulito(codice);
  if (!c) return false;
  const invitanteId = await utenteDelCodice(c, admin);
  if (!invitanteId || invitanteId === invitatoId) return false;

  const { error } = await admin.from("inviti").insert({
    invitato_id: invitatoId,
    invitante_id: invitanteId,
    codice: c,
    scade_il: scadenza(new Date()).toISOString(),
  });
  return !error;
}

/**
 * Una ricarica e' arrivata: paga chi ha invitato (e, la prima volta, anche
 * l'invitato). `ref` e' la chiave del movimento (l'id della sessione Stripe):
 * grantVolt e' idempotente su (utente, tipo, ref), quindi un webhook ripetuto
 * non accredita due volte.
 */
export async function premiaRicarica(invitatoId: string, voltRicarica: number, ref: string, admin: Admin = createServerClient()): Promise<void> {
  const { data: invito, error } = await admin
    .from("inviti")
    .select("invitante_id, scade_il, prima_ricarica_fatta, volt_guadagnati")
    .eq("invitato_id", invitatoId)
    .maybeSingle();
  if (error || !invito) return; // nessun invito, o tabella non pronta

  const p = premiDaRicarica(voltRicarica, {
    scade_il: invito.scade_il as string,
    prima_ricarica_fatta: Boolean(invito.prima_ricarica_fatta),
  });
  if (p.invitante <= 0 && p.invitato <= 0) return;

  if (p.invitante > 0) await grantVolt(invito.invitante_id as string, p.invitante, "bonus", `invito:${ref}`);
  if (p.invitato > 0) await grantVolt(invitatoId, p.invitato, "bonus", `invitato:${ref}`);

  await admin
    .from("inviti")
    .update({
      prima_ricarica_fatta: true,
      volt_guadagnati: (Number(invito.volt_guadagnati) || 0) + p.invitante,
    })
    .eq("invitato_id", invitatoId);

  console.log(`[invito] ricarica di ${voltRicarica} VOLT: ${p.invitante} a chi ha invitato, ${p.invitato} all'invitato`);
}

/** Il riepilogo per la scheda "Invita". */
export async function riepilogoInviti(userId: string, admin: Admin = createServerClient()) {
  const { data, error } = await admin
    .from("inviti")
    .select("invitato_id, created_at, prima_ricarica_fatta, volt_guadagnati")
    .eq("invitante_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return null; // tabella non pronta
  const righe = data ?? [];
  return {
    quanti: righe.length,
    attivi: righe.filter((r) => r.prima_ricarica_fatta).length,
    voltGuadagnati: righe.reduce((s, r) => s + (Number(r.volt_guadagnati) || 0), 0),
  };
}
