"use client";
import { useState, type ReactNode } from "react";
import type { WardData } from "./demo";
import { Radar } from "./Radar";
import { Detections } from "./Detections";
import { DetectionDetail } from "./DetectionDetail";

type Tab = "radar" | "detections" | "nemesis" | "vault";

// Icone bottom-nav (portate dal mockup, stroke=currentColor cosi' seguono lo
// stato del tab: muted / amber / strike).
const ICONS: Record<Tab, ReactNode> = {
  radar: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z" /><circle cx="12" cy="11" r="2.3" /></svg>),
  detections: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-3.5-3.5" /></svg>),
  nemesis: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l9 5v6c0 5-3.8 8.6-9 10C6.8 21.6 3 18 3 13V7l9-5z" /><path d="M12 7v5" /></svg>),
  vault: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M9 4v16M4 9h5" /></svg>),
};

const STRIKE_ICON = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" /><path d="M12 8v5" /></svg>);

export function WardApp({ data }: { data: WardData }) {
  const [tab, setTab] = useState<Tab>("radar");
  const [sel, setSel] = useState<Set<string>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setSel((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const openDetection = data.detections.find((d) => d.id === openId) ?? null;

  return (
    <div className="ward-frame">
      <header className="topbar">
        <div className="tmark">S</div>
        <div className="twrap"><div className="eb">SEMBLIC</div><div className="nm">Ward</div></div>
        <div className="id-chip"><span className="o" /><span>{data.identity.handle}</span><span className="cdot" /></div>
      </header>

      <main className="body">
        {tab === "radar" && <Radar data={data} />}
        {tab === "detections" && (
          openDetection
            ? <DetectionDetail detection={openDetection} onBack={() => setOpenId(null)} />
            : <Detections data={data} selected={sel} onToggle={toggle} onOpen={setOpenId} />
        )}
        {tab === "nemesis" && <Placeholder title="Nemesis" />}
        {tab === "vault" && <Placeholder title="Vault" />}
      </main>

      {tab === "detections" && !openDetection && (
        <div className={`selbar${sel.size > 0 ? " up" : ""}`}>
          <div className="cnt"><b>{sel.size}</b> bersagli selezionati</div>
          <button type="button" className="nem-btn" title="Strike Nemesis (in arrivo)">{STRIKE_ICON}Attiva Nemesis</button>
        </div>
      )}

      <nav className="tabbar">
        <TabBtn id="radar" cur={tab} set={setTab} label="Radar" icon={ICONS.radar} />
        <TabBtn id="detections" cur={tab} set={setTab} label="Detections" icon={ICONS.detections} />
        <TabBtn id="nemesis" cur={tab} set={setTab} label="Nemesis" icon={ICONS.nemesis} nem badge={data.nemesis.inProgress} />
        <TabBtn id="vault" cur={tab} set={setTab} label="Vault" icon={ICONS.vault} />
      </nav>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <section className="screen on" style={{ padding: "40px 16px" }}>
      <div className="h-row"><h2>{title}</h2></div>
      <p style={{ fontFamily: "var(--font-ward-mono)", fontSize: 12, color: "var(--ward-muted)" }}>
        In arrivo nella prossima fase.
      </p>
    </section>
  );
}

function TabBtn({ id, cur, set, label, icon, nem, badge }: {
  id: Tab; cur: Tab; set: (t: Tab) => void; label: string; icon: ReactNode; nem?: boolean; badge?: number;
}) {
  const on = cur === id;
  return (
    <button type="button" className={`tab${on ? " on" : ""}${nem ? " nemtab" : ""}`} onClick={() => set(id)}>
      {icon}
      <span className="lb">{label}</span>
      {nem && badge ? <span className="badge show">{badge}</span> : null}
    </button>
  );
}
