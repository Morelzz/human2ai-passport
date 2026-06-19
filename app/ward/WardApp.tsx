"use client";
import { useState } from "react";
import type { WardData } from "./demo";
import { Radar } from "./Radar";

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
        <TabBtn id="radar" cur={tab} set={setTab} label="Radar" />
        <TabBtn id="detections" cur={tab} set={setTab} label="Detections" />
        <TabBtn id="nemesis" cur={tab} set={setTab} label="Nemesis" nem badge={data.nemesis.inProgress} />
        <TabBtn id="vault" cur={tab} set={setTab} label="Vault" />
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

function TabBtn({ id, cur, set, label, nem, badge }: {
  id: Tab; cur: Tab; set: (t: Tab) => void; label: string; nem?: boolean; badge?: number;
}) {
  const on = cur === id;
  return (
    <button type="button" className={`tab${on ? " on" : ""}${nem ? " nemtab" : ""}`} onClick={() => set(id)}>
      <span className="lb">{label}</span>
      {nem && badge ? <span className="badge show">{badge}</span> : null}
    </button>
  );
}
