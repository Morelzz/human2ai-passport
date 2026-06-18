"use client";

// ──────────────────────────────────────────────────────────────────────────
// PosePicker — campo "Posa" + bottom sheet con le pose raggruppate per categoria.
// E' il primo dei tre selettori di composizione sotto il blocco "La scena":
// un .field (icona silhouette + titolo posa corrente + hint + chevron) che apre
// un foglio inferiore (.scrim + .sheet con translateY) elencando POSES per cat.
// Selezione singola: scegliere una posa chiude il foglio e aggiorna il campo.
// Sorgente di verita del LOOK: design/anteprima_match_mobile.html (.field/.sheet).
// Sorgente di verita dei DATI: lib/studio-options.ts (POSES).
// NB: in preview headless l'animazione translateY e' ferma, ma open/close toggla.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { POSES } from "@/lib/studio-options";

// Silhouette SVG portate dal prototipo (oggetto SIL): un disegnino per ogni
// posa, mappato sul valore .v del catalogo. currentColor = colore del campo
// (amber quando attivo). Se un valore non ha silhouette si usa "nessuna".
const POSE_SIL: Record<string, string> = {
  nessuna:
    '<g fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="20" cy="30" r="11"/><line x1="12.5" y1="37.5" x2="27.5" y2="22.5"/></g>',
  casuale:
    '<g fill="currentColor"><circle cx="20" cy="10" r="6"/><rect x="13.5" y="16" width="13" height="22" rx="6"/><rect x="10.4" y="17" width="3.7" height="16" rx="1.85" transform="rotate(12 12 24)"/><rect x="26.4" y="17" width="3.7" height="16" rx="1.85" transform="rotate(-8 28 24)"/><rect x="15" y="36" width="4.4" height="22" rx="2.2" transform="rotate(5 17 47)"/><rect x="20.6" y="36" width="4.4" height="22" rx="2.2" transform="rotate(-6 22 47)"/></g>',
  in_piedi:
    '<g fill="currentColor"><circle cx="20" cy="10" r="6"/><rect x="13.5" y="16" width="13" height="22" rx="6"/><rect x="9.6" y="17" width="4" height="18" rx="2"/><rect x="26.4" y="17" width="4" height="18" rx="2"/><rect x="15" y="36" width="4.4" height="22" rx="2.2"/><rect x="20.6" y="36" width="4.4" height="22" rx="2.2"/></g>',
  tre_quarti:
    '<g fill="currentColor" transform="rotate(7 20 32)"><circle cx="21" cy="10" r="6"/><rect x="14.5" y="16" width="12" height="22" rx="6"/><rect x="10.8" y="17" width="3.8" height="17" rx="1.9"/><rect x="14.5" y="25" width="11.5" height="4.2" rx="2.1"/><rect x="16.4" y="36" width="4.3" height="22" rx="2.1"/><rect x="21" y="36" width="4.3" height="22" rx="2.1"/></g>',
  mani_tasca:
    '<g fill="currentColor"><circle cx="20" cy="10" r="6"/><rect x="13.5" y="16" width="13" height="22" rx="6"/><rect x="10.4" y="17" width="3.6" height="11" rx="1.8"/><rect x="11.5" y="27" width="7" height="3.4" rx="1.7" transform="rotate(22 13 28)"/><rect x="26" y="17" width="3.6" height="11" rx="1.8"/><rect x="21.5" y="27" width="7" height="3.4" rx="1.7" transform="rotate(-22 27 28)"/><rect x="15" y="36" width="4.4" height="22" rx="2.2"/><rect x="20.6" y="36" width="4.4" height="22" rx="2.2"/></g>',
  mani_fianchi:
    '<g fill="currentColor"><circle cx="20" cy="10" r="6"/><rect x="13.5" y="16" width="13" height="22" rx="6"/><rect x="8" y="17" width="3.6" height="12" rx="1.8" transform="rotate(26 9.8 23)"/><rect x="9.5" y="27" width="7.5" height="3.4" rx="1.7" transform="rotate(-32 13 28)"/><rect x="28.4" y="17" width="3.6" height="12" rx="1.8" transform="rotate(-26 30.2 23)"/><rect x="23" y="27" width="7.5" height="3.4" rx="1.7" transform="rotate(32 27 28)"/><rect x="15" y="36" width="4.4" height="22" rx="2.2"/><rect x="20.6" y="36" width="4.4" height="22" rx="2.2"/></g>',
  braccia_conserte:
    '<g fill="currentColor"><circle cx="20" cy="10" r="6"/><rect x="13" y="16" width="14" height="22" rx="6"/><rect x="15" y="36" width="4.4" height="22" rx="2.2"/><rect x="20.6" y="36" width="4.4" height="22" rx="2.2"/><rect x="10.5" y="22.5" width="19" height="4.4" rx="2.2" transform="rotate(13 20 24.7)"/><rect x="10.5" y="22.5" width="19" height="4.4" rx="2.2" transform="rotate(-13 20 24.7)"/></g>',
  mano_mento:
    '<g fill="currentColor"><circle cx="20" cy="10" r="6"/><rect x="13.5" y="16" width="13" height="22" rx="6"/><rect x="26.4" y="17" width="3.9" height="18" rx="1.95"/><rect x="10.4" y="24" width="3.8" height="11" rx="1.9"/><rect x="10.4" y="14" width="3.7" height="12" rx="1.85" transform="rotate(34 12.2 20)"/><rect x="15" y="36" width="4.4" height="22" rx="2.2"/><rect x="20.6" y="36" width="4.4" height="22" rx="2.2"/></g>',
  al_muro:
    '<rect x="32.5" y="3" width="4.5" height="54" rx="1.5" fill="currentColor" opacity="0.5"/><g fill="currentColor" transform="rotate(-11 23 33)"><circle cx="23" cy="11" r="5.8"/><rect x="17" y="17" width="12" height="21" rx="5.5"/><rect x="13.4" y="18" width="3.7" height="16" rx="1.85"/><rect x="18.4" y="36" width="4.2" height="21" rx="2.1" transform="rotate(12 20 46)"/><rect x="22.2" y="36" width="4.2" height="21" rx="2.1" transform="rotate(-12 24 46)"/></g>',
  profilo:
    '<g fill="currentColor"><circle cx="19" cy="10" r="6"/><path d="M24.5 8.6 l3.6 1.8 l-3.6 1.8 z"/><rect x="15.5" y="16" width="9.5" height="22" rx="4.6"/><rect x="16" y="17" width="3.6" height="16" rx="1.8"/><rect x="16.6" y="36" width="4.3" height="22" rx="2.1"/><rect x="20.2" y="36" width="4.3" height="22" rx="2.1"/></g>',
  braccia_aperte:
    '<g fill="currentColor"><circle cx="20" cy="11" r="6"/><rect x="14" y="17" width="12" height="21" rx="6"/><rect x="3.5" y="11.5" width="13" height="4.2" rx="2.1" transform="rotate(-26 10 13.6)"/><rect x="23.5" y="11.5" width="13" height="4.2" rx="2.1" transform="rotate(26 30 13.6)"/><rect x="15.4" y="36" width="4.4" height="22" rx="2.2" transform="rotate(7 17.6 47)"/><rect x="20.2" y="36" width="4.4" height="22" rx="2.2" transform="rotate(-7 22.4 47)"/></g>',
  sgabello:
    '<g fill="currentColor"><rect x="11" y="40" width="18" height="3" rx="1.5" opacity="0.55"/><rect x="13" y="43" width="2.4" height="15" rx="1" opacity="0.55"/><rect x="24.6" y="43" width="2.4" height="15" rx="1" opacity="0.55"/><circle cx="20" cy="8" r="5.6"/><rect x="14" y="13" width="12" height="18" rx="5.5"/><rect x="14" y="31" width="13" height="4.2" rx="2.1"/><rect x="15" y="39" width="3.7" height="17" rx="1.85"/><rect x="21.2" y="39" width="3.7" height="17" rx="1.85"/></g>',
  a_terra:
    '<rect x="6" y="53" width="28" height="2.6" rx="1.3" fill="currentColor" opacity="0.45"/><g fill="currentColor"><circle cx="15" cy="15" r="5.6"/><rect x="11" y="20" width="10.5" height="15" rx="5" transform="rotate(-8 16 27)"/><rect x="12" y="48" width="17" height="4" rx="2"/><rect x="25" y="36" width="4" height="15" rx="2"/><rect x="16" y="29" width="11" height="3.4" rx="1.7" transform="rotate(-26 21 31)"/></g>',
  camminata:
    '<g fill="currentColor"><circle cx="20" cy="10" r="6"/><rect x="14" y="16" width="12" height="19" rx="6"/><rect x="24.5" y="17" width="3.8" height="15" rx="1.9" transform="rotate(-24 26 22)"/><rect x="11.5" y="17" width="3.8" height="15" rx="1.9" transform="rotate(20 13 22)"/><rect x="18.6" y="34" width="4.4" height="23" rx="2.2" transform="rotate(-18 21 42)"/><rect x="17" y="34" width="4.4" height="23" rx="2.2" transform="rotate(20 19 42)"/></g>',
  di_spalle:
    '<g fill="currentColor"><circle cx="21" cy="10" r="6"/><path d="M15.5 9 l-3 1.6 l3 1.6 z"/><rect x="11" y="15" width="18" height="21" rx="7"/><rect x="14.5" y="35" width="4.6" height="23" rx="2.3"/><rect x="20.9" y="35" width="4.6" height="23" rx="2.3"/></g>',
  prodotto_mano:
    '<g fill="currentColor"><circle cx="18" cy="10" r="6"/><rect x="11.5" y="16" width="13" height="22" rx="6"/><rect x="9" y="17" width="3.6" height="17" rx="1.8"/><rect x="23" y="20" width="3.6" height="8" rx="1.8"/><rect x="25" y="25" width="8" height="3.4" rx="1.7"/><rect x="30" y="22" width="7" height="9" rx="1.6" opacity="0.85"/><rect x="13" y="36" width="4.4" height="22" rx="2.2"/><rect x="18.6" y="36" width="4.4" height="22" rx="2.2"/></g>',
};

// Ordine delle categorie come nel prototipo (le voci seguono l'ordine di POSES).
const CAT_ORDER = ["Base", "In piedi", "Seduta", "Dinamica", "Editoriale"];

// Disegna la silhouette di una posa (fallback su "nessuna" se mancante).
function PoseGlyph({ value, className }: { value: string; className?: string }) {
  const svg = POSE_SIL[value] ?? POSE_SIL.nessuna;
  return (
    <svg viewBox="0 0 40 60" className={className} dangerouslySetInnerHTML={{ __html: svg }} aria-hidden />
  );
}

export function PosePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = POSES.find((p) => p.v === value) ?? POSES[0];

  // Categorie presenti, nell'ordine canonico, con le loro voci.
  const groups = CAT_ORDER.map((cat) => ({
    cat,
    items: POSES.filter((p) => p.cat === cat),
  })).filter((g) => g.items.length > 0);

  // Blocco dello scroll di sfondo quando il foglio e aperto: cosi la rotella
  // scorre il pannello e non il sito dietro (bug desktop).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="mt-4">
      <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-amber">Posa</span>

      {/* Campo: icona silhouette + titolo posa + hint + chevron. Apre il foglio. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-elevated px-3 py-3 text-left transition-colors hover:border-amber/40"
      >
        <span className="flex h-[46px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-border bg-obsidian text-amber">
          <PoseGlyph value={current.v} className="h-[38px] w-[26px]" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium text-foreground">{current.l}</span>
          <span className="block text-[0.7rem] text-faint">tocca per scegliere</span>
        </span>
        <span className="text-faint" aria-hidden>▾</span>
      </button>

      {/* Foglio inferiore: scrim a tutto schermo + pannello in basso che scorre su. */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Scegli la posa">
          {/* Scrim cliccabile: chiude il foglio. */}
          <button
            type="button"
            aria-label="Chiudi"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/50"
          />
          {/* Pannello: slide-up via translateY (in preview headless resta aperto). */}
          <div className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-[0_-12px_40px_rgba(0,0,0,0.5)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[70vh] sm:w-[min(90vw,520px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border">
            <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-edge sm:hidden" />
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-medium text-foreground">Scegli la posa</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Chiudi" className="text-lg text-faint hover:text-foreground">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-6 pt-3">
              {groups.map((g) => (
                <div key={g.cat}>
                  <p className="mb-2 mt-3 text-[0.62rem] uppercase tracking-[0.06em] text-faint first:mt-1">{g.cat}</p>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                    {g.items.map((p) => {
                      const active = p.v === value;
                      return (
                        <button
                          key={p.v}
                          type="button"
                          onClick={() => {
                            onChange(p.v);
                            setOpen(false);
                          }}
                          aria-pressed={active}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <span
                            className={`grid aspect-[3/4] w-full place-items-center rounded-xl border-[1.5px] transition-colors ${
                              active ? "border-amber bg-amber/10 text-amber" : "border-border bg-elevated text-muted"
                            }`}
                          >
                            <PoseGlyph value={p.v} className="h-16 w-12" />
                          </span>
                          <span className="text-center text-[0.62rem] leading-tight text-muted">{p.l}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
