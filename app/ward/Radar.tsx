import type { WardData } from "./demo";

// Home Radar: l'elemento firma di Ward. Radar con sweep salvia, blip per
// severita', core identita' (gradiente depth), tri-stat, presenza Nemesis,
// e l'azione "Avvia scansione". Con onScan (modalita' dati reali) il bottone
// lancia lo scan; in demo resta inerte. Dati da WardData.
export function Radar({
  data,
  onScan,
  scanning,
  scanMsg,
}: {
  data: WardData;
  onScan?: () => void;
  scanning?: boolean;
  scanMsg?: string | null;
}) {
  const { stats, blips, nemesis, identity, lastSweep, nextScan } = data;
  return (
    <section className="screen on" id="s-radar">
      <div className="h-row"><h2>Radar</h2><span className="sub">ultima scansione {lastSweep}</span></div>

      <div className="radar">
        <div className="ring" /><div className="ring r2" /><div className="ring r3" /><div className="ring r4" />
        <div className="cross" /><div className="sweep" />
        <div className="core"><span>{identity.coreId}</span></div>
        {blips.map((b, i) => (
          <div key={i} className={`blip ${b.sev}`} style={{ left: `${b.x}%`, top: `${b.y}%` }} />
        ))}
      </div>

      <div className="status-line">
        <div className="b"><span className="d" /> Protetto</div>
        <div className="s">monitoraggio attivo, prossima scansione {nextScan}</div>
      </div>

      <div className="tri">
        <div className="m"><div className="n c">{stats.confirmed}</div><div className="k">Confermati</div></div>
        <div className="m"><div className="n a">{stats.review}</div><div className="k">Da rivedere</div></div>
        <div className="m"><div className="n s">{stats.cleared}</div><div className="k">Cancellati</div></div>
      </div>

      <div className="nem-strip">
        <div className="nmk" aria-hidden />
        <div className="ns-txt">
          <div className="t">NEMESIS</div>
          <div className="m">{nemesis.landed} takedown andati a segno, {nemesis.inProgress} in corso</div>
        </div>
      </div>

      <button className="btn" type="button" onClick={onScan} disabled={scanning}>
        <span>{scanning ? "Scansione in corso..." : "Avvia scansione"}</span>
      </button>
      {scanMsg ? <div className="scan-msg" role="status">{scanMsg}</div> : null}
    </section>
  );
}
