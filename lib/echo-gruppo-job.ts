// ──────────────────────────────────────────────────────────────────────────
// ECHO, scena di GRUPPO (worker). Stessa sostanza di executeEchoJob, per 2-4
// protagonisti: consenso vivo di ognuno, le foto SCELTE di ognuno, la scena in
// un colpo solo col ritocco mirato di chi non torna (lib/gruppo), scan dei
// volti protetti, una generazione sola per chi compra e una riga
// generation_people per ogni persona (royalty, posizione, somiglianza).
// SERVER-ONLY.
// ──────────────────────────────────────────────────────────────────────────

import crypto from "crypto";
import type { createServerClient } from "@/lib/supabase";
import { riferimentiScelti } from "@/lib/riferimenti-scelti";
import { generaConRipiego } from "@/lib/engines/echo";
import { echoCostCentsFromUsage, echoResLabel } from "@/lib/engines/echo-cost";
import { uploadPublicImage } from "@/lib/storage";
import { scanGeneratedImageForProtected, outputScanVerdict } from "@/lib/face-scan-server";
import { DISTANZA_STESSA_PERSONA } from "@/lib/identity-score";
import { consentBlockReason, type LiveConsentState } from "@/lib/consent-gate";
import { eseguiGruppo, dividiRoyalty, type Protagonista } from "@/lib/gruppo";
import { refundJobVolt, type EchoJobRow } from "@/lib/echo-job";

type Admin = ReturnType<typeof createServerClient>;

export async function executeGruppoJob(admin: Admin, job: EchoJobRow): Promise<void> {
  const nowIso = () => new Date().toISOString();
  try {
    const p = job.params;
    const gruppo = p.gruppo ?? [];
    if (gruppo.length < 2) throw new Error("scena di gruppo senza protagonisti");

    // Consenso VIVO di ognuno subito prima di spendere il motore.
    const { data: vivi } = await admin
      .from("avatars")
      .select("id, revoked_at, commercial_consent, protection_only")
      .in("id", gruppo.map((g) => g.avatarId));
    for (const g of gruppo) {
      const live = (vivi ?? []).find((v) => v.id === g.avatarId) ?? null;
      const block = consentBlockReason(live as LiveConsentState | null);
      if (block) throw new Error(`${g.alias}: ${block}`);
    }

    // Foto vere di ognuno (solo in memoria) e le loro impronte per misurare.
    const persone: Protagonista[] = [];
    const riferimenti = [];
    for (const g of gruppo) {
      const scelte = await riferimentiScelti(g.handle);
      if (scelte.foto.length === 0) throw new Error(`reference-set assente per ${g.alias}`);
      persone.push({ avatarId: g.avatarId, handle: g.handle, alias: g.alias, identityText: g.identityText, foto: scelte.foto });
      riferimenti.push(scelte.riferimento);
    }

    let modello = "";
    const esito = await eseguiGruppo({
      scena: p.scene,
      persone,
      riferimenti,
      fotografia: p.photographic,
      genera: async (prompt, immagini) => {
        const r = await generaConRipiego({ prompt, references: immagini, size: p.echoSize, quality: p.echoQuality });
        modello = r.model;
        return { png: r.png, costoCent: echoCostCentsFromUsage(r.usage) ?? 0 };
      },
    });

    // Somiglianza: anche dopo il ritocco una persona non e' "lei" (oltre la
    // distanza della stessa persona, o il suo volto non si trova): la scena non si
    // consegna e i crediti tornano. Una foto con il nome di qualcuno che non c'e'
    // non esce. Misuratore non disponibile = non si blocca (come lo scatto singolo).
    const persa = esito.misura?.persone.find((x) => x.distanza == null || x.distanza > DISTANZA_STESSA_PERSONA);
    if (persa) {
      const chi = gruppo.find((g) => g.handle === persa.chiave)?.alias ?? persa.chiave;
      console.warn(`[ECHO gruppo ${job.id}] ${chi} non tenuta (d ${persa.distanza ?? "n/d"}) dopo ${esito.passaggi} scatti: non consegnata`);
      throw new Error(`La scena non ha tenuto il volto di ${chi}: non te la consegniamo e non ti addebitiamo nulla. Riprova con una scena più semplice o con i volti più in primo piano.`);
    }

    // VETO: nessun volto protetto nello scatto finale (fail-closed, come lo scatto singolo).
    const verdetto = outputScanVerdict(await scanGeneratedImageForProtected(esito.png));
    if (verdetto === "unavailable") throw new Error("Verifica di tutela non disponibile ora: generazione annullata, riprova tra poco, nessun costo a tuo carico.");
    if (verdetto === "regenerate") throw new Error("Nella scena è comparso un volto registrato come protetto: generazione annullata per tutela, nessun costo a tuo carico.");

    const primo = gruppo[0];
    const cleanUrl = await uploadPublicImage("generations", `${primo.avatarId}/${crypto.randomUUID()}.png`, esito.png);
    const { gross_cents, fee_cents, royalty_cents, surcharge_cents } = p.pricing;
    const quote = p.pricing.quote?.length === gruppo.length ? p.pricing.quote : dividiRoyalty(royalty_cents, gruppo.length);

    const genId = crypto.randomUUID();
    const certificate = crypto
      .createHash("sha256")
      .update(`${gruppo.map((g) => g.avatarId).join("+")}|${genId}|${p.scene}|${nowIso().slice(0, 10)}`)
      .digest("hex");

    // Una generazione per chi compra: avatar_id = il primo da sinistra, royalty =
    // il totale pagato alle persone (la ricevuta torna: lordo = commissione + royalty).
    const { error: genErr } = await admin.from("generations").insert({
      id: genId,
      avatar_id: primo.avatarId,
      buyer_id: job.buyer_id,
      prompt: p.scene,
      category: p.category,
      mode: "commercial",
      gross_cents,
      fee_cents,
      royalty_cents,
      certificate,
      image_url: cleanUrl,
      engine_ref: `echo:${modello}`,
    });
    if (genErr) throw new Error(`registrazione generazione fallita: ${genErr.message}`);

    // Chi c'e' nella foto, con la sua parte e la sua somiglianza.
    const misure = esito.misura?.persone ?? [];
    const righe = gruppo.map((g, i) => {
      const m = misure.find((x) => x.chiave === g.handle);
      return {
        generation_id: genId,
        avatar_id: g.avatarId,
        posizione: i,
        royalty_cents: quote[i],
        identity_score: m?.percentuale ?? null,
        identity_distance: m?.distanza ?? null,
      };
    });
    const { error: gpErr } = await admin.from("generation_people").insert(righe);
    if (gpErr) console.error(`[ECHO gruppo ${job.id}] generation_people non scritta: ${gpErr.message}`);

    const meta: Record<string, unknown> = { tier: "ECHO", engine_cost_cents: esito.costoCent };
    const ph = p.photo;
    if (ph?.camera) meta.camera = ph.camera;
    if (ph?.lens) meta.lens = ph.lens;
    if (ph?.light) meta.light = ph.light;
    if (ph?.colorStyle) meta.color_style = ph.colorStyle;
    await admin.from("generations").update(meta).eq("id", genId);
    if (esito.misura) {
      // Sulla generazione la somiglianza PEGGIORE: il numero prudente.
      const peggiore = misure.reduce<(typeof misure)[number] | null>((a, b) => (!a || (b.distanza ?? 9) > (a.distanza ?? 9) ? b : a), null);
      await admin.from("generations").update({
        identity_score: peggiore?.percentuale ?? null,
        identity_distance: peggiore?.distanza ?? null,
        identity_extra_faces: esito.misura.sconosciuti,
      }).eq("id", genId);
    }

    // Royalty e utilizzi a ognuno.
    for (let i = 0; i < gruppo.length; i++) {
      const { data: av } = await admin.from("avatars").select("usage_count, royalty_accrued_cents").eq("id", gruppo[i].avatarId).maybeSingle();
      await admin
        .from("avatars")
        .update({ usage_count: (av?.usage_count ?? 0) + 1, royalty_accrued_cents: (av?.royalty_accrued_cents ?? 0) + quote[i] })
        .eq("id", gruppo[i].avatarId);
    }

    await admin
      .from("generation_jobs")
      .update({
        status: "done",
        finished_at: nowIso(),
        certificate,
        image_url: cleanUrl,
        gross_cents,
        fee_cents,
        royalty_cents,
        surcharge_cents,
        engine_cost_cents: esito.costoCent,
      })
      .eq("id", job.id);

    const chi = misure.map((m) => `${m.chiave} ${m.percentuale ?? "n/d"}%`).join(", ");
    console.log(`[ECHO gruppo ${job.id}] done · ${gruppo.length} persone · ${esito.passaggi} scatti${esito.ripassato ? ` (ritoccata ${esito.ripassato})` : ""} · ${echoResLabel(p.echoSize)} · reale=${(esito.costoCent / 100).toFixed(3)}€ · ${chi} · sconosciuti ${esito.misura?.sconosciuti ?? "n/d"}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "errore sconosciuto";
    await admin.from("generation_jobs").update({ status: "error", finished_at: nowIso(), error: msg.slice(0, 500) }).eq("id", job.id);
    await refundJobVolt(admin, job.id, job.buyer_id, job.params.pricing.gross_cents);
    console.error(`[ECHO gruppo ${job.id}] error: ${msg}`);
  }
}
