"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { voltStr, VOLT_STRINGS } from "@/lib/strings/volt";
import type { VoltTransaction } from "@/lib/volt";

// VoltBadge (VOLT_SYSTEM §2, requisito non negoziabile): saldo sempre visibile
// in alto per ogni account, con Ricarica immediata. Desktop: pillola + dropdown
// (ultimi 5 movimenti). Mobile: ⚡N compatto + bottom-sheet (ultimi 3).
// Aggiornamento senza refresh via eventi finestra:
//   volt:spent  {detail:{n}}        decremento ottimistico alla conferma
//   volt:update {detail:{balance}}  saldo autorevole dal server
//   volt:refetch                    risincronizza da /api/volt (es. rollback)

const FMT = new Intl.NumberFormat("it-IT");

function txLabel(t: VoltTransaction): string {
  const n = Math.abs(t.delta_volt);
  switch (t.type) {
    case "generation":
      return voltStr("history.row.gen", { tier: t.ref?.split(":")[0] ?? "", n }).replace("  ", " ");
    case "recharge":
      return voltStr("history.row.recharge", { pacchetto: t.ref ?? "", n });
    case "bonus":
      return voltStr("history.row.bonus", { n });
    case "refund":
      return voltStr("history.row.refund", { n });
    default:
      return voltStr("history.row.admin_grant", { n });
  }
}

export function VoltBadge({ initial, threshold }: { initial: number; threshold: number }) {
  const [balance, setBalance] = useState(initial);
  const [shown, setShown] = useState(initial); // valore animato (count-up/down)
  const [txs, setTxs] = useState<VoltTransaction[]>([]);
  const [open, setOpen] = useState(false); // dropdown desktop
  const [sheet, setSheet] = useState(false); // bottom-sheet mobile
  const wrapRef = useRef<HTMLDivElement>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/volt");
      if (!res.ok) return;
      const data = await res.json();
      if (data.configured) {
        setBalance(data.balance);
        setTxs(data.transactions ?? []);
      }
    } catch {
      /* offline: si riprova al prossimo evento */
    }
  }, []);

  useEffect(() => {
    refetch();
    const onSpent = (e: Event) => setBalance((b) => Math.max(0, b - (((e as CustomEvent).detail?.n as number) ?? 0)));
    const onUpdate = (e: Event) => {
      const v = (e as CustomEvent).detail?.balance;
      if (typeof v === "number") setBalance(v);
      refetch();
    };
    const onRefetch = () => refetch();
    window.addEventListener("volt:spent", onSpent);
    window.addEventListener("volt:update", onUpdate);
    window.addEventListener("volt:refetch", onRefetch);
    return () => {
      window.removeEventListener("volt:spent", onSpent);
      window.removeEventListener("volt:update", onUpdate);
      window.removeEventListener("volt:refetch", onRefetch);
    };
  }, [refetch]);

  // Count-up/down morbido, sobrio (niente coriandoli).
  useEffect(() => {
    if (shown === balance) return;
    const from = shown;
    const t0 = performance.now();
    const dur = 350;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const v = Math.round(from + (balance - from) * (1 - Math.pow(1 - k, 3)));
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);

  // Chiudi il dropdown cliccando fuori.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const zero = balance <= 0;
  const low = !zero && balance < threshold;
  const counterColor = zero ? "text-crimson" : low ? "text-amber-400" : "text-foreground";
  const tooltip = zero
    ? VOLT_STRINGS["volt.zero.tooltip"]
    : low
      ? voltStr("volt.low.tooltip", { n: balance })
      : VOLT_STRINGS["volt.tooltip.what"];

  const dropdownBody = (limit: number) => (
    <>
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-faint">{VOLT_STRINGS["history.title"]}</p>
      {txs.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-muted">{VOLT_STRINGS["history.empty"]}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {txs.slice(0, limit).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-muted">{txLabel(t)}</span>
              <span className={`shrink-0 font-bold ${t.delta_volt < 0 ? "text-muted" : "text-teal"}`}>
                {t.delta_volt < 0 ? "−" : "+"}{FMT.format(Math.abs(t.delta_volt))} ⚡
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
        <Link href="/account/volt" className="text-xs text-muted transition-colors hover:text-foreground" onClick={() => { setOpen(false); setSheet(false); }}>
          Storico completo →
        </Link>
        <Link href="/account/volt" onClick={() => { setOpen(false); setSheet(false); }}
          className="rounded-full bg-[#8b47f0] px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:brightness-110">
          {VOLT_STRINGS["volt.badge.cta"]}
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: pillola completa con Ricarica */}
      <div ref={wrapRef} className="relative hidden md:block">
        <div
          className={`flex items-center gap-1 rounded-full border py-0.5 pl-2 pr-0.5 ${
            zero ? "border-crimson/40 bg-crimson/10" : low ? "border-amber-400/30 bg-amber-400/5" : "border-white/12 bg-white/[0.04]"
          }`}
        >
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            title={tooltip}
            aria-label={`Saldo VOLT: ${balance}. ${VOLT_STRINGS["volt.badge.cta"]}`}
            aria-expanded={open}
            className="flex items-center gap-1 text-[0.8rem]"
          >
            <span aria-hidden>⚡</span>
            <span className={`font-bold tabular-nums ${counterColor}`}>{FMT.format(shown)}</span>
          </button>
          <Link
            href="/account/volt"
            className={`ml-1 rounded-full bg-[#8b47f0] px-2.5 py-0.5 text-[0.68rem] font-bold text-white transition-all hover:brightness-110 ${zero ? "animate-[pulse_1s_ease-in-out_1]" : ""}`}
          >
            {VOLT_STRINGS["volt.badge.cta"]}
          </Link>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-[#101018] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold tabular-nums">{FMT.format(balance)} <span aria-hidden>⚡</span></span>
              </div>
              {dropdownBody(5)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile: compatto, tap = bottom-sheet */}
      <button
        type="button"
        onClick={() => setSheet(true)}
        aria-label={`Saldo VOLT: ${balance}. ${VOLT_STRINGS["volt.badge.cta"]}`}
        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm md:hidden ${
          zero ? "border-crimson/40 bg-crimson/10" : low ? "border-amber-400/30 bg-amber-400/5" : "border-white/12 bg-white/[0.04]"
        }`}
      >
        <span aria-hidden>⚡</span>
        <span className={`font-bold tabular-nums ${counterColor}`}>{FMT.format(shown)}</span>
      </button>
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheet(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 bg-[#101018] p-5 pb-8 md:hidden"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tabular-nums">{FMT.format(balance)}</span>
                <span aria-hidden className="text-xl">⚡</span>
              </div>
              {dropdownBody(3)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
