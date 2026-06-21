"use client";
import { useState, type ReactNode } from "react";
import type { WardData, WardOp } from "./demo";
import { Radar } from "./Radar";
import { Detections } from "./Detections";
import { DetectionDetail } from "./DetectionDetail";
import { NemesisOps } from "./NemesisOps";
import { NemesisStrike } from "./NemesisStrike";
import { Vault } from "./Vault";

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

export function WardApp({ data, scanAvatarId }: { data: WardData; scanAvatarId?: string }) {
  const [tab, setTab] = useState<Tab>("radar");
  const [sel, setSel] = useState<Set<string>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  // Stato dinamico dopo uno strike (demo): bersagli colpiti + nuove operazioni.
  const [strikeOpen, setStrikeOpen] = useState(false);
  const [struck, setStruck] = useState<Set<string>>(() => new Set());
  const [extraOps, setExtraOps] = useState<WardOp[]>([]);
  const [inProgressDelta, setInProgressDelta] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  // Avvia uno scan reale per l'avatar protetto (solo in modalita' dati reali:
  // scanAvatarId presente). In demo il bottone resta inerte come prima.
  const handleScan = async () => {
    if (!scanAvatarId || scanning) return;
    setScanning(true);
    setScanMsg("Scansione in corso...");
    try {
      const res = await fetch("/api/ward/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatarId: scanAvatarId }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) setScanMsg(`Scansione completata: ${j.matches} match su ${j.candidates} candidati.`);
      else if (res.status === 403) setScanMsg("Monitoraggio non consentito per questo avatar.");
      else setScanMsg(j?.reason || j?.error || "Scansione non riuscita.");
    } catch {
      setScanMsg("Errore di rete durante la scansione.");
    } finally {
      setScanning(false);
    }
  };

  const toggle = (id: string) => setSel((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const openDetection = data.detections.find((d) => d.id === openId) ?? null;
  const strikeTargets = data.detections.filter((d) => sel.has(d.id));
  const inProgress = data.nemesis.inProgress + inProgressDelta;

  const completeStrike = (ids: string[]) => {
    setStruck((prev) => new Set([...prev, ...ids]));
    const newOps: WardOp[] = ids.map((id) => {
      const d = data.detections.find((x) => x.id === id);
      return { id: "op-" + id, dom: d ? d.dom : id, meta: "DMCA + GDPR inviati, ora", status: "pending" };
    });
    setExtraOps((prev) => [...newOps, ...prev]);
    setInProgressDelta((n) => n + ids.length);
    setSel(new Set());
    setStrikeOpen(false);
    setTab("nemesis");
  };

  return (
    <div className="ward-frame">
      <header className="topbar">
        <div className="tmark">S</div>
        <div className="twrap"><div className="eb">SEMBLIC</div><div className="nm">Ward</div></div>
        <div className="id-chip"><span className="o" /><span>{data.identity.handle}</span><span className="cdot" /></div>
      </header>

      <main className="body">
        {tab === "radar" && <Radar data={data} onScan={scanAvatarId ? handleScan : undefined} scanning={scanning} scanMsg={scanMsg} />}
        {tab === "detections" && (
          openDetection
            ? <DetectionDetail detection={openDetection} onBack={() => setOpenId(null)} />
            : <Detections data={data} selected={sel} struck={struck} onToggle={toggle} onOpen={setOpenId} />
        )}
        {tab === "nemesis" && <NemesisOps nemesis={{ ...data.nemesis, inProgress }} ops={[...extraOps, ...data.ops]} />}
        {tab === "vault" && <Vault data={data} />}
      </main>

      {tab === "detections" && !openDetection && (
        <div className={`selbar${sel.size > 0 ? " up" : ""}`}>
          <div className="cnt"><b>{sel.size}</b> bersagli selezionati</div>
          <button type="button" className="nem-btn" onClick={() => { if (sel.size > 0) setStrikeOpen(true); }}>{STRIKE_ICON}Attiva Nemesis</button>
        </div>
      )}

      {strikeOpen && strikeTargets.length > 0 && (
        <NemesisStrike targets={strikeTargets} onClose={() => setStrikeOpen(false)} onComplete={completeStrike} />
      )}

      <nav className="tabbar">
        <TabBtn id="radar" cur={tab} set={setTab} label="Radar" icon={ICONS.radar} />
        <TabBtn id="detections" cur={tab} set={setTab} label="Trovati" icon={ICONS.detections} />
        <TabBtn id="nemesis" cur={tab} set={setTab} label="Nemesis" icon={ICONS.nemesis} nem badge={inProgress} />
        <TabBtn id="vault" cur={tab} set={setTab} label="Vault" icon={ICONS.vault} />
      </nav>
    </div>
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
