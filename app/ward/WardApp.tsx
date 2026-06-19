"use client";
import { useState, type ReactNode } from "react";
import type { WardData } from "./demo";
import { Radar } from "./Radar";

// Icone bottom-nav (portate dal mockup, stroke=currentColor cosi' seguono lo
// stato del tab: muted / amber / strike).
const ICONS: Record<Tab, ReactNode> = {
  radar: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z" /><circle cx="12" cy="11" r="2.3" /></svg>),
  detections: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-3.5-3.5" /></svg>),
  nemesis: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l9 5v6c0 5-3.8 8.6-9 10C6.8 21.6 3 18 3 13V7l9-5z" /><path d="M12 7v5" /></svg>),
  vault: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M9 4v16M4 9h5" /></svg>),
};

type Tab = "radar" | "detections" | "nemesis" | "vault";

// Guscio della app Ward: topbar (identita' + consenso), le 4 schermate
// toggled (come il mockup, una alla volta), e la bottom-nav. In questa fase
// solo Radar e' costruita; le altre 3 tab mostrano uno stato "in arrivo".
export function WardApp({ data }: { data: WardData }) {
  const [tab, setTab] = useState<Tab>("radar");
  return (
    <div className="ward-frame">
      <header className="topbar">
        <div className="tmark">S</div>
        <div className="twrap"><div className="eb">SEMBLIC</div><div className="nm">Ward</div></div>
        <div className="id-chip"><span className="o" /><span>{data.identity.handle}</span><span className="cdot" /></div>
      </header>

      <main className="body">
        {tab === "radar" && <Radar data={data} />}
        {tab === "detections" && <Placeholder title="Detections" />}
        {tab === "nemesis" && <Placeholder title="Nemesis" />}
        {tab === "vault" && <Placeholder title="Vault" />}
      </main>

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
