"use client";

// ──────────────────────────────────────────────────────────────────────────
// DictateButton — pillola "Detta a voce" da mettere accanto a un campo di
// testo (es. la scena della generazione). Push-to-talk: tocca per parlare,
// ritocca per fermare. Mentre ascolti, anteprima dal vivo del parlato; ogni
// pezzo consolidato viene appeso al campo via onText (l'unione la fa il
// chiamante con joinScene). Se il browser non supporta la Web Speech API il
// componente non rende nulla (il campo resta usabile da tastiera).
// Stile SEMBLIC: pillola Amber, anello pulsante in ascolto, errori in crimson.
// NB testi italiani senza trattini lunghi (regola di Morelz).
// ──────────────────────────────────────────────────────────────────────────

import { useDictation } from "./useDictation";

function MicGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

export function DictateButton({
  onText,
  idleHint = "Detta la scena a voce",
}: {
  onText: (chunk: string) => void;
  idleHint?: string;
}) {
  const { supported, listening, interim, error, toggle } = useDictation(onText);

  // Browser senza Web Speech (es. Firefox): niente bottone, si scrive a mano.
  if (!supported) return null;

  return (
    <div className="mt-2.5 flex items-center gap-2.5">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? "Ferma la dettatura" : "Detta a voce"}
        className={`focus-ring relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.72rem] font-semibold transition-colors ${
          listening
            ? "border border-amber bg-amber/15 text-amber"
            : "border border-amber/30 bg-amber/[0.07] text-amber hover:bg-amber/15"
        }`}
      >
        {listening && (
          <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full bg-amber/20" />
        )}
        <MicGlyph />
        {listening ? "Ascolto… tocca per fermare" : "Detta"}
      </button>

      {/* Didascalia dal vivo: errore (crimson) ha la priorita', poi l'anteprima
          del parlato mentre si ascolta, infine il suggerimento neutro a riposo. */}
      {error ? (
        <span className="text-[0.7rem] leading-snug text-crimson">{error}</span>
      ) : listening ? (
        <span className="truncate text-[0.7rem] italic leading-snug text-muted" aria-live="polite">
          {interim || "Parla pure…"}
        </span>
      ) : (
        <span className="text-[0.7rem] leading-snug text-faint">{idleHint}</span>
      )}
    </div>
  );
}
