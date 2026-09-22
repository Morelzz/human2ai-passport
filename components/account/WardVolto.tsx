"use client";

import { useState } from "react";
import Link from "next/link";

// WARD SUL PROPRIO VOLTO (23/9/2026). Chi ha detto si' al registro e' la
// persona piu' esposta di tutte: il suo volto gira. Fino a ieri il cane da
// guardia ce l'aveva solo chi si era registrato in SOLA protezione; adesso
// anche chi concede puo' accenderlo.
//
// Due stati soli: spento (si accende) e acceso (si cerca adesso). Niente
// promesse: il testo dice quello che Ward sa fare e quello che non puo' fare.

export function WardVolto({ attivo, avatarId, ultimi }: { attivo: boolean; avatarId: string | null; ultimi: number }) {
  const [acceso, setAcceso] = useState(attivo);
  const [busy, setBusy] = useState(false);
  const [esito, setEsito] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function accendi() {
    setBusy(true);
    setErrore(null);
    try {
      const r = await fetch("/api/ward/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ onMatch: "notify", months: 12 }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Non si è acceso.");
      setAcceso(true);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Non si è acceso.");
    } finally {
      setBusy(false);
    }
  }

  async function cerca() {
    if (!avatarId) return;
    setBusy(true);
    setErrore(null);
    setEsito(null);
    try {
      const r = await fetch("/api/ward/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatarId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "La ricerca non è partita.");
      const n = Number(j.matches ?? 0);
      setEsito(n > 0 ? `Trovate ${n} ${n === 1 ? "copia" : "copie"} da guardare.` : "Nessuna copia trovata, per ora.");
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "La ricerca non è partita.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <p className="kicker">WARD · DOVE COMPARE IL TUO VOLTO</p>
      <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">
        {acceso
          ? "Ward cerca sul web pubblico le immagini in cui compare il tuo volto e ti avvisa. Dentro Semblic sei già protetta dal consenso: questo serve per quello che succede fuori."
          : "Hai detto sì al registro, e il tuo volto gira. Ward cerca sul web pubblico dove compare e te lo dice. Non impedisce niente a nessuno: ti fa sapere, e da lì puoi chiedere la rimozione."}
      </p>

      {acceso ? (
        <>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-verified/30 bg-verified-soft px-3 py-2.5">
            <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-verified" />
            <span className="text-[0.82rem] font-bold text-on-verified">
              Ward acceso{ultimi > 0 ? ` · ${ultimi} ${ultimi === 1 ? "copia trovata" : "copie trovate"}` : ""}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={cerca}
              disabled={busy || !avatarId}
              className="focus-ring rounded-full bg-amber px-4 py-2.5 text-[0.85rem] font-bold text-on-amber transition-colors hover:bg-amber-hover disabled:opacity-60"
            >
              {busy ? "Sto cercando…" : "Cerca adesso"}
            </button>
            <Link
              href="/ward"
              className="focus-ring rounded-full border border-border px-4 py-2.5 text-[0.85rem] font-semibold text-muted transition-colors hover:border-amber/60 hover:text-foreground"
            >
              Cos&apos;è Ward
            </Link>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={accendi}
          disabled={busy}
          className="focus-ring mt-4 w-full rounded-full bg-amber px-4 py-2.5 text-[0.88rem] font-bold text-on-amber transition-colors hover:bg-amber-hover disabled:opacity-60"
        >
          {busy ? "Accendo…" : "Accendi Ward sul tuo volto"}
        </button>
      )}

      {esito && <p className="mt-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[0.85rem]">{esito}</p>}
      {errore && <p className="mt-3 rounded-xl border border-blocked/30 bg-blocked-soft px-3.5 py-2.5 text-[0.85rem] text-on-blocked">{errore}</p>}

      <p className="mt-3 text-[0.72rem] leading-relaxed text-faint">
        Ward guarda il web pubblico: quello che sta dietro un accesso non lo vede. E non conserva niente delle immagini
        di terzi, solo l&apos;indirizzo dove le ha viste.
      </p>
    </div>
  );
}
