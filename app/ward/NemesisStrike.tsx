import { useState, useEffect, useCallback } from "react";
import type { WardDetection } from "./demo";

// Overlay dello STRIKE: il momento dell'azione (dramma), distinto dalla ops room
// (calma). briefing -> "Conferma il colpo" -> finestra di cancel 4s -> sequenza
// d'invio -> fatto. Per ogni target deposita DMCA + GDPR Art.17 + evidenza.
type Phase = "arm" | "counting" | "striking" | "done";
type TStatus = "idle" | "processing" | "hit";

const NEM = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l9 5v6c0 5-3.8 8.6-9 10C6.8 21.6 3 18 3 13V7l9-5z" /><path d="M12 7v5" /></svg>);
const BACK = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>);
const BOLT = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L4.5 13H11l-1 9 9-12h-6.5L13 2z" /></svg>);
const DMCA = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v12H4z" /><path d="M4 20h16" /></svg>);
const GDPR = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><rect x="4" y="4" width="16" height="16" rx="3" /></svg>);
const EVID = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>);
const CHK = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>);

export function NemesisStrike({ targets, onClose, onComplete }: {
  targets: WardDetection[];
  onClose: () => void;
  onComplete: (ids: string[]) => void;
}) {
  const [phase, setPhase] = useState<Phase>("arm");
  const [count, setCount] = useState(4);
  const [statuses, setStatuses] = useState<Record<string, TStatus>>({});

  // Finestra di cancel: 4 -> 0, poi parte la sequenza.
  useEffect(() => {
    if (phase !== "counting") return;
    if (count <= 0) { setPhase("striking"); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]);

  // Sequenza d'invio: ogni target processing -> hit.
  useEffect(() => {
    if (phase !== "striking") return;
    let i = 0;
    let alive = true;
    const step = () => {
      if (!alive) return;
      if (i >= targets.length) { setPhase("done"); return; }
      const id = targets[i].id;
      setStatuses((s) => ({ ...s, [id]: "processing" }));
      setTimeout(() => {
        if (!alive) return;
        setStatuses((s) => ({ ...s, [id]: "hit" }));
        i += 1;
        setTimeout(step, 250);
      }, 700);
    };
    step();
    return () => { alive = false; };
  }, [phase, targets]);

  // Fatto -> chiude e aggiorna le ops.
  const finish = useCallback(() => onComplete(targets.map((t) => t.id)), [onComplete, targets]);
  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(finish, 1200);
    return () => clearTimeout(t);
  }, [phase, finish]);

  return (
    <div className="nem open" role="dialog" aria-label="Strike Nemesis">
      <div className="nem-inner">
        <div className="nem-h">
          <div className="row">
            <div className="nmk">{NEM}</div>
            <div><div className="ttl">NEMESIS</div><div className="tag">strike, ognuno ha cio&apos; che gli spetta</div></div>
            {phase === "arm" && <button type="button" className="nback" aria-label="Chiudi" onClick={onClose}>{BACK}</button>}
          </div>
        </div>

        <div className="nem-body">
          <div className="nem-intro">Stai per agire contro i target selezionati. Nemesis deposita takedown formali e richieste di cancellazione, allegando l&apos;evidenza ancorata per ciascuno. E&apos; un&apos;azione legale.</div>
          <div className="nem-auth"><span className="d" /><div><b>Azione autorizzata</b><span>consenso di monitoraggio attivo, nello scope</span></div></div>
          <div className="nlabel2">Verra&apos; eseguito su ogni target</div>
          {targets.map((t) => {
            const st = statuses[t.id] ?? "idle";
            return (
              <div className={`ntarget${st === "processing" ? " processing" : st === "hit" ? " hit" : ""}`} key={t.id}>
                <div className="nt-top">
                  <span className="nt-dom">{t.dom}</span>
                  {st === "idle" && <span className="nt-sc">{(t.score / 100).toFixed(2)}</span>}
                  {st === "processing" && <span className="nt-state"><span className="spin" /> invio</span>}
                  {st === "hit" && <span className="nt-state">{CHK} inviato</span>}
                </div>
                <div className="nt-acts">
                  <div className="a">{DMCA} Takedown DMCA all&apos;host</div>
                  <div className="a">{GDPR} Richiesta di cancellazione GDPR Art.17</div>
                  <div className="a">{EVID} Evidenza ancorata allegata</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="nem-foot">
          {phase === "arm" && (
            <button type="button" className="strike-btn" onClick={() => { setCount(4); setPhase("counting"); }}>{BOLT} Conferma il colpo</button>
          )}
          {phase === "counting" && (
            <div className="cancel-line">
              <span className="ctxt">Colpo tra {count}s...</span>
              <button type="button" className="cbtn" onClick={() => setPhase("arm")}>Annulla</button>
            </div>
          )}
          {(phase === "striking" || phase === "done") && (
            <div className="done-line">{phase === "done" ? <>{CHK} {targets.length} takedown inviati</> : <span>Invio in corso...</span>}</div>
          )}
        </div>
      </div>
    </div>
  );
}
