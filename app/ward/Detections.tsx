import type { WardData, WardDetection } from "./demo";

const CHECK = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>);
const LOCK = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>);

// Lista delle detection. Confermate = selezionabili (selbox) per il colpo
// Nemesis; review = "Conferma match"; minore = notice BLOCCATO non selezionabile.
// Tap sul corpo della card apre il dettaglio; tap sulla selbox (solo) seleziona.
export function Detections({ data, selected, onToggle, onOpen }: {
  data: WardData;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const confirmed = data.detections.filter((d) => d.band === "confirmed" && d.sensitivity !== "minor").length;
  return (
    <section className="screen on" id="s-det">
      <div className="h-row"><h2>Detections</h2><span className="sub">{confirmed} confermate, tocca per i dettagli</span></div>
      <div className="filters">
        <span className="chip on">Tutte</span>
        <span className="chip"><span className="d c" />Confermate</span>
        <span className="chip"><span className="d a" />Da rivedere</span>
      </div>
      {data.detections.map((d) => (
        <DetectionCard key={d.id} d={d} sel={selected.has(d.id)} onToggle={onToggle} onOpen={onOpen} />
      ))}
    </section>
  );
}

function DetectionCard({ d, sel, onToggle, onOpen }: {
  d: WardDetection; sel: boolean; onToggle: (id: string) => void; onOpen: (id: string) => void;
}) {
  const open = () => onOpen(d.id);
  const keyOpen = (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };

  // MINORE: mai una preview, mai selezionabile. Solo un notice bloccato che apre
  // il dettaglio in stato locked (regola child-safety A2.6).
  if (d.sensitivity === "minor") {
    return (
      <div className="card locked" role="button" tabIndex={0} onClick={open} onKeyDown={keyOpen}>
        <div className="locked-note">
          <div className="lk">{LOCK}</div>
          <div>
            <div className="lt">Bloccato, non mostrabile</div>
            <div className="ls">instradato alle autorita&apos;, {d.reportRef}</div>
          </div>
        </div>
      </div>
    );
  }

  const isConfirmed = d.band === "confirmed";
  const threatLabel = isConfirmed
    ? (d.sensitivity === "sensitive" ? "Non autorizzato, sensibile" : "Non autorizzato")
    : "Da rivedere";

  return (
    <div className={`card${sel ? " selected" : ""}`} role="button" tabIndex={0} onClick={open} onKeyDown={keyOpen}>
      {isConfirmed && (
        <button type="button" className="selbox" aria-label={sel ? "Deseleziona" : "Seleziona"}
          onClick={(e) => { e.stopPropagation(); onToggle(d.id); }}>{CHECK}</button>
      )}
      <div className="card-row">
        <div className="shot"><span className="glyph" /><span className="scan" /></div>
        <div className="card-main">
          <div className="card-top">
            <span className="dom">{d.dom}</span>
            <span className={`score ${isConfirmed ? "c" : "a"}`}>{(d.score / 100).toFixed(2)}</span>
          </div>
          <span className={`threat ${isConfirmed ? "c" : "a"}`}>{threatLabel}</span>
          <div className="card-meta">{d.meta}</div>
        </div>
      </div>
      {!isConfirmed && (
        <div className="review-foot">
          <button type="button" className="mini-act" onClick={(e) => { e.stopPropagation(); open(); }}>Conferma match</button>
        </div>
      )}
    </div>
  );
}
