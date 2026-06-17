"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// F1 — banner cookie conforme: default SOLO essenziali, scelta granulare,
// nessun dark pattern (i due bottoni hanno pari dignità visiva). Oggi la
// piattaforma usa solo cookie tecnici; la preferenza "statistiche" viene
// salvata e verrà rispettata se/quando introdurremo analytics.
// La pagina /cookie può riaprire il banner via evento "semblic:cookie-prefs".

const STORAGE_KEY = "semblic-cookie-prefs";

export type CookiePrefs = { essential: true; analytics: boolean; ts: number };

export function readCookiePrefs(): CookiePrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CookiePrefs) : null;
  } catch {
    return null;
  }
}

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const prefs = readCookiePrefs();
    if (!prefs) setOpen(true);
    else setAnalytics(prefs.analytics);
    const reopen = () => { setDetail(true); setOpen(true); };
    window.addEventListener("semblic:cookie-prefs", reopen);
    return () => window.removeEventListener("semblic:cookie-prefs", reopen);
  }, []);

  function save(an: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ essential: true, analytics: an, ts: Date.now() }));
    } catch { /* storage non disponibile: il banner riapparirà */ }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div role="dialog" aria-label="Preferenze cookie" className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-xl">
      <div className="rounded-2xl border border-white/12 bg-[#11141D]/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <p className="text-sm font-bold">Cookie, senza giochetti.</p>
        <p className="mt-1.5 text-[0.8rem] leading-relaxed text-muted">
          Usiamo solo cookie <span className="text-foreground">essenziali</span> (accesso e preferenze).
          Niente profilazione, niente pubblicità. Dettagli nella{" "}
          <Link href="/cookie" className="text-violet-light underline">cookie policy</Link>.
        </p>

        {detail && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
            <label className="flex items-center justify-between gap-3 text-[0.8rem]">
              <span><span className="font-semibold text-foreground">Essenziali</span> <span className="text-faint">· accesso, sicurezza, preferenze</span></span>
              <span className="rounded-full border border-teal/35 bg-teal/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-teal">sempre attivi</span>
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-[0.8rem]">
              <span><span className="font-semibold text-foreground">Statistiche</span> <span className="text-faint">· oggi non in uso; la scelta varrà se le introdurremo</span></span>
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="h-4 w-4 accent-[#F2A93B]" />
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Pari dignità visiva: nessun dark pattern */}
          <button onClick={() => save(false)} className="rounded-full border border-white/20 px-5 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-foreground transition-colors hover:border-white/45">
            Solo essenziali
          </button>
          <button onClick={() => save(detail ? analytics : true)} className="rounded-full border border-white/20 px-5 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-foreground transition-colors hover:border-white/45">
            {detail ? "Salva preferenze" : "Accetta tutto"}
          </button>
          {!detail && (
            <button onClick={() => setDetail(true)} className="px-2 py-2.5 text-[0.72rem] font-semibold text-muted underline-offset-2 transition-colors hover:text-foreground hover:underline">
              Preferenze
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Bottone per riaprire il banner (usato in /cookie).
export function ManageCookiesButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("semblic:cookie-prefs"))}
      className="rounded-full border border-violet/35 bg-violet/10 px-5 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-violet-light transition-colors hover:bg-violet/20"
    >
      Gestisci le preferenze cookie
    </button>
  );
}
