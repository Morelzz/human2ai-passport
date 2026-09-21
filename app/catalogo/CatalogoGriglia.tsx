"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AvatarTile, type TileAvatar } from "@/components/avatar/AvatarTile";
import { FILTRI, bollini, conteggi, passaIlFiltro, type ChiaveFiltro, type VoltoCatalogo } from "@/lib/catalogo";

// IL CATALOGO CHE PARLA (22/9/2026). Ogni tessera dice cosa puoi fare con
// quella persona (foto, video, quante volte l'hanno scelta), quanto costa
// partire, e porta dritta al set con quel volto gia' scelto. Sopra, sei filtri
// con i numeri veri dentro: un filtro che conta zero non si mostra.
// Sul telefono i filtri scorrono di lato, mai in colonna.

const TONO: Record<string, string> = {
  si: "border-verified/25 bg-verified-soft text-on-verified",
  no: "border-blocked/20 bg-blocked-soft text-on-blocked",
  uso: "border-amber/35 bg-amber-soft text-amber-ink",
  neutro: "border-border bg-surface text-muted",
};

export function CatalogoGriglia({ volti, tile, daCent }: { volti: VoltoCatalogo[]; tile: Record<string, TileAvatar>; daCent: number }) {
  const [filtro, setFiltro] = useState<ChiaveFiltro>("tutti");
  const numeri = useMemo(() => conteggi(volti), [volti]);
  const visibili = useMemo(() => volti.filter((v) => passaIlFiltro(v, filtro)), [volti, filtro]);
  const da = (daCent / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });

  return (
    <>
      <div className="riga-scorrevole senza-barra -mx-5 mt-7 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
        {/* Un filtro che conta zero non porta da nessuna parte; uno che li
            prende tutti non toglie niente: nessuno dei due si mostra. */}
        {FILTRI.filter((f) => f.v === "tutti" || (numeri[f.v] > 0 && numeri[f.v] < numeri.tutti)).map((f) => {
          const on = f.v === filtro;
          return (
            <button
              key={f.v}
              type="button"
              onClick={() => setFiltro(f.v)}
              aria-pressed={on}
              className={`focus-ring inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[0.85rem] font-semibold transition-colors ${
                on ? "border-foreground bg-foreground text-[var(--bg)]" : "border-border bg-surface text-muted hover:border-amber/60 hover:text-foreground"
              }`}
            >
              {f.l}
              <span className={`font-mono text-[0.68rem] ${on ? "opacity-70" : "text-faint"}`}>{numeri[f.v]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {visibili.map((v, i) => {
          const a = tile[v.handle];
          if (!a) return null;
          return (
            <div key={v.handle} className="flex flex-col overflow-hidden rounded-[18px] border border-border bg-surface">
              <div className={v.revocato ? "grayscale-[0.9] opacity-75" : ""}>
                <AvatarTile a={a} quadrato priority={i < 4} />
              </div>
              <div className="flex flex-1 flex-col gap-2.5 p-2.5 sm:p-3">
                <div className="flex flex-wrap gap-1.5">
                  {bollini(v).map((b) => (
                    <span key={b.testo} className={`rounded-full border px-2 py-[3px] font-mono text-[0.58rem] font-bold tracking-[0.06em] ${TONO[b.tono]}`}>
                      {b.testo}
                    </span>
                  ))}
                </div>
                {/* Sul telefono la tessera e' larga 160px: prezzo sopra e bottone
                    a tutta larghezza sotto, altrimenti "Scegli Random" sborda. */}
                <div className="mt-auto flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  {v.foto ? (
                    <>
                      <span className="text-[0.76rem] text-faint">
                        da <strong className="text-[0.92rem] font-bold tracking-[-0.02em] text-foreground">{da}</strong>
                      </span>
                      <Link
                        href={`/match?avatar=${encodeURIComponent(v.handle)}`}
                        className="focus-ring block shrink-0 rounded-full bg-amber px-3 py-1.5 text-center text-[0.76rem] font-bold text-on-amber transition-colors hover:bg-amber-hover sm:w-auto"
                      >
                        Scegli<span className="hidden sm:inline"> {v.alias.split(" ")[0]}</span>
                      </Link>
                    </>
                  ) : (
                    <span className="text-[0.76rem] leading-snug text-faint">
                      {v.revocato ? "Il sistema ha obbedito: non è generabile." : "Non disponibile per l’uso commerciale."}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Ultima tessera: l'invito. Chiude la griglia e dice cosa fare dopo. */}
        <Link
          href="/signup/avatar"
          className="focus-ring group relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-[18px] border border-dashed border-edge bg-surface bg-[radial-gradient(90%_55%_at_100%_0%,var(--amber-soft),transparent_70%)] p-4 transition-colors hover:border-amber sm:p-5"
        >
          <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-soft text-[1.4rem] font-semibold leading-none text-amber-ink transition-transform group-hover:scale-110">+</span>
          <span className="flex flex-col gap-1.5">
            <span className="text-[1.15rem] font-bold leading-tight tracking-[-0.02em] sm:text-[1.3rem]">Il tuo volto qui</span>
            <span className="text-[0.85rem] leading-snug text-muted">Verifica, consenso firmato e una quota a ogni utilizzo.</span>
            <span className="mt-1 text-[0.85rem] font-semibold text-amber-ink">Entra nel registro</span>
          </span>
        </Link>
      </div>
    </>
  );
}
