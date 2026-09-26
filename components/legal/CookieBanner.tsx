"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// F1: banner cookie conforme: default SOLO essenziali, scelta granulare,
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
  const pathname = usePathname();

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

  // L'app Ward (loggata) ha la sua bottom-nav: il banner cookie globale non deve coprirla.
  if (pathname?.startsWith("/ward")) return null;

  if (!open) return null;

  // 27/9/2026 (proposta approvata da Morelz): finche' usiamo solo cookie
  // essenziali non c'e' niente da accettare, quindi niente "Accetta tutto" e
  // niente riquadro che copre un terzo del telefono. Una riga sola con i
  // dettagli e "Ok". Il pannello completo resta: lo riapre la pagina /cookie.
  if (!detail) {
    return (
      <div role="region" aria-label="Informativa cookie" className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-lg">
        <div className="flex items-center gap-3 rounded-2xl bg-foreground py-2.5 pl-4 pr-2.5 text-[0.9rem] text-background shadow-[0_18px_40px_-20px_rgba(23,21,15,0.55)]">
          <p className="min-w-0 flex-1 leading-snug">
            Solo cookie essenziali, niente profilazione.{" "}
            <Link href="/cookie" className="font-semibold underline underline-offset-2">Dettagli</Link>
          </p>
          <button
            onClick={() => save(false)}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-full bg-amber px-5 font-semibold text-on-amber transition-colors hover:bg-amber-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          >
            Ok
          </button>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-label="Preferenze cookie" className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-xl">
      <div className="rounded-2xl border border-border bg-[color-mix(in_oklab,var(--surface)_95%,transparent)] p-5 shadow-[0_24px_60px_-24px_rgba(23,21,15,0.35)] backdrop-blur-xl">
        <p className="text-sm font-bold">Cookie, senza giochetti.</p>
        <p className="mt-1.5 text-[0.8rem] leading-relaxed text-muted">
          Usiamo solo cookie <span className="text-foreground">essenziali</span>{" "}(accesso e preferenze).
          Niente profilazione, niente pubblicità. Dettagli nella{" "}
          <Link href="/cookie" className="text-amber-ink underline">cookie policy</Link>.
        </p>

        {detail && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-surface p-3.5">
            <label className="flex items-center justify-between gap-3 text-[0.8rem]">
              <span><span className="font-semibold text-foreground">Essenziali</span> <span className="text-faint">· accesso, sicurezza, preferenze</span></span>
              <span className="rounded-full border border-verified/35 bg-verified-soft px-2.5 py-0.5 text-[0.65rem] font-bold text-verified">sempre attivi</span>
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-[0.8rem]">
              <span><span className="font-semibold text-foreground">Statistiche</span> <span className="text-faint">· oggi non in uso; la scelta varrà se le introdurremo</span></span>
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="h-4 w-4 accent-[var(--amber-c)]" />
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Pari dignità visiva: nessun dark pattern */}
          <button onClick={() => save(false)} className="rounded-full border border-border px-5 py-2.5 text-[0.9rem] font-semibold text-foreground transition-colors hover:border-edge">
            Solo essenziali
          </button>
          <button onClick={() => save(analytics)} className="rounded-full border border-border px-5 py-2.5 text-[0.9rem] font-semibold text-foreground transition-colors hover:border-edge">
            Salva preferenze
          </button>
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
      className="rounded-full border border-amber/50 bg-amber-soft px-5 py-2.5 text-[0.9rem] font-semibold text-amber-ink transition-colors hover:bg-amber-soft"
    >
      Gestisci le preferenze cookie
    </button>
  );
}
