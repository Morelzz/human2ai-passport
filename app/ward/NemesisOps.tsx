import type { WardData, WardOp } from "./demo";

// Nemesis ops room: la "war room" calma (registro), distinta dal momento dello
// strike (overlay, altrove). Win counter + operazioni attive/risolte.
const NEM = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l9 5v6c0 5-3.8 8.6-9 10C6.8 21.6 3 18 3 13V7l9-5z" /><path d="M12 7v5" /></svg>);
const CLOCK = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="9" /></svg>);
const SHIELD = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l8 4v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4z" /></svg>);
const CHK = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 6L9 17l-5-5" /></svg>);

const STATUS_LABEL: Record<WardOp["status"], string> = { pending: "Host in attesa", removed: "Rimosso", legal: "Legale" };

export function NemesisOps({ data }: { data: WardData }) {
  const { nemesis, ops } = data;
  const active = ops.filter((o) => o.status !== "removed");
  const resolved = ops.filter((o) => o.status === "removed");
  return (
    <section className="screen on" id="s-nem-ops">
      <div className="ops-hero">
        <div className="row">
          <div className="nmk">{NEM}</div>
          <div><div className="ttl">NEMESIS</div><div className="tag">ognuno ha cio&apos; che gli spetta</div></div>
        </div>
        <div className="ops-ready"><span className="d" /> Armato, parte da qualsiasi detection</div>
      </div>

      <div className="ops-stats">
        <div className="m"><div className="n s">{nemesis.landed}</div><div className="k">Takedown a segno</div></div>
        <div className="m"><div className="n a">{nemesis.inProgress}</div><div className="k">In corso</div></div>
        <div className="m"><div className="n c">{nemesis.escalated}</div><div className="k">Escalation</div></div>
      </div>

      <div className="nlabel">Operazioni attive</div>
      {active.map((o) => <CaseRow key={o.id} o={o} />)}

      <div className="nlabel" style={{ marginTop: 20 }}>Risolte</div>
      {resolved.map((o) => <CaseRow key={o.id} o={o} />)}
    </section>
  );
}

function CaseRow({ o }: { o: WardOp }) {
  const icon = o.status === "removed" ? CHK : o.status === "legal" ? SHIELD : CLOCK;
  const color = o.status === "removed" ? "var(--verified-c)" : o.status === "legal" ? "var(--blocked-c)" : "var(--amber-c)";
  return (
    <div className="case">
      <div className="ci" style={{ color }}>{icon}</div>
      <div className="info"><div className="d">{o.dom}</div><div className="m">{o.meta}</div></div>
      <span className={`st ${o.status}`}>{STATUS_LABEL[o.status]}</span>
    </div>
  );
}
