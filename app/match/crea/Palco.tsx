"use client";

import type { Volto } from "./SceltaVolto";

// ──────────────────────────────────────────────────────────────────────────
// IL PALCO DI CREA (27/9/2026). La testa della pagina e' un set al buio, nella
// lingua della prima pagina: chi hai messo in scena sta sotto la lente, con il
// suo consenso acceso, da sinistra a destra come uscira' nello scatto. Senza
// nessuno scelto, le sagome aspettano e Semblic sceglie per te.
// La luce scelta si vede qui, sui volti veri (un velo CSS, non il risultato).
// ──────────────────────────────────────────────────────────────────────────

const POSTI = ["a sinistra", "2ª", "3ª", "a destra"];

export function Palco({
  inScena,
  velo,
  filtro,
  onScegli,
}: {
  inScena: Volto[];
  velo: string;
  filtro?: string;
  onScegli: () => void;
}) {
  const n = inScena.length;
  const vuoti = n === 0 ? 3 : 0;
  return (
    <section
      data-theme="dark"
      aria-label="In scena"
      className="palco-crea relative -mx-5 overflow-hidden bg-[#0E0C09] px-5 pb-8 pt-8 text-[#F4EEE3] sm:mx-0 sm:mt-6 sm:rounded-[28px] sm:px-10 sm:pb-24 sm:pt-12"
    >
      {/* la griglia del set e la riga che scandisce */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(rgba(244,238,227,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(244,238,227,0.05) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_75%_40%,rgba(226,154,46,0.16),transparent_70%)]" />

      <div className="relative grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
        <div>
          <span className="font-mono text-[0.72rem] tracking-[0.18em] text-[#E29A2E]">CREA</span>
          <h1 className="mt-3 text-balance text-[2.05rem] font-bold leading-[0.98] tracking-[-0.045em] sm:text-[3.4rem] lg:text-[3.9rem]">
            {n > 1 ? "Una scena, persone vere." : "Una persona vera. Una frase."}
          </h1>
          <p className="mt-3 max-w-[46ch] text-pretty text-[0.95rem] leading-relaxed text-white/70 max-sm:line-clamp-3 sm:text-[1.08rem]">
            {n > 1
              ? "Ognuno ha detto sì, ognuno viene misurato sul risultato e pagato. Scrivi cosa succede e cosa indossa ciascuno."
              : "Scegli chi e scrivi cosa succede. Luce, vestiti e formato li cambi con un tocco; il consenso lo leggiamo prima di ogni scatto."}
          </p>
        </div>

        <div className="senza-barra -mx-5 flex items-end gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:justify-center sm:px-0 lg:justify-end">
          {inScena.map((v, i) => (
            <figure key={v.handle} className="palco-volto relative w-[96px] shrink-0 sm:w-[150px] lg:w-[min(170px,11vw)]" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] bg-[#1a1612]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.src} alt="" className="h-full w-full object-cover object-top" style={{ filter: filtro }} />
                <span aria-hidden className="absolute inset-0 transition-[background] duration-500" style={{ background: velo }} />
                {/* gli angoli della lente, come nella prima pagina */}
                <span aria-hidden className="absolute left-[16%] right-[16%] top-[10%] h-[46%]">
                  <i className="absolute left-0 top-0 h-3.5 w-3.5 border-l-2 border-t-2 border-[#3DDC97]/80" />
                  <i className="absolute right-0 top-0 h-3.5 w-3.5 border-r-2 border-t-2 border-[#3DDC97]/80" />
                  <i className="absolute bottom-0 left-0 h-3.5 w-3.5 border-b-2 border-l-2 border-[#3DDC97]/80" />
                  <i className="absolute bottom-0 right-0 h-3.5 w-3.5 border-b-2 border-r-2 border-[#3DDC97]/80" />
                </span>
                <span aria-hidden className="palco-scan" />
              </div>
              <figcaption className="mt-2 flex items-center justify-between gap-2 px-0.5">
                <span className="truncate text-[0.88rem] font-semibold sm:text-[0.95rem]">{v.alias}</span>
                <span className="hidden shrink-0 font-mono text-[0.68rem] text-white/50 sm:inline">{n > 1 ? POSTI[i === n - 1 ? 3 : i] : "in scena"}</span>
              </figcaption>
              <span className="mt-1 inline-flex items-center gap-1.5 px-0.5 text-[0.75rem] text-[#7FD9A8]">
                <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#3DDC97] shadow-[0_0_8px_#3DDC97]" />
                consenso attivo
              </span>
            </figure>
          ))}
          {Array.from({ length: vuoti }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={onScegli}
              className="group relative w-[88px] shrink-0 text-left sm:w-[140px] lg:w-[min(160px,10vw)]"
              aria-label={i === 1 ? "Scegli chi sarà nella foto" : undefined}
              tabIndex={i === 1 ? 0 : -1}
            >
              <span className={`flex aspect-[3/4] items-center justify-center rounded-[18px] border border-dashed border-white/20 bg-white/[0.03] transition-colors group-hover:border-[#E29A2E]/70 ${i === 1 ? "" : "opacity-60"}`}>
                <svg width="40" height="52" viewBox="0 0 40 52" fill="none" aria-hidden className="text-white/25 transition-colors group-hover:text-[#E29A2E]/80">
                  <circle cx="20" cy="15" r="9" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M3 50c1.5-11 8.5-17 17-17s15.5 6 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="mt-2 block px-0.5 text-[0.78rem] text-white/50 sm:text-[0.85rem]">{i === 1 ? "Scegli tu, o lascia fare a Semblic" : ""}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
