"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isWhitelisted, type AllowEntry } from "@/lib/ward/whitelist";

// Schermata Ward v2 (content leak finder): per una NOSTRA immagine generata,
// mostra le copie trovate sul web con semaforo di reputazione (giallo = piattaforma
// nota, rosso = zona nascosta) e tag filigrana (conferma quando una copia e'
// davvero nostra). La whitelist NASCONDE: "Segna sicuro" toglie la riga dai
// risultati. Nessuna cifra, nessuna accusa automatica. Nemesis = fase 2.

export type FinderMatch = {
  id: string;
  sourceUrl: string;
  pageUrl: string | null;
  host: string | null;
  band: "confirmed" | "review";
  reputation: "exposed" | "obscure" | null;
  watermarkPresent: boolean | null;
  certificate: string | null;
};

const C = {
  obsidian: "#0C0F17", card: "#141A24", line: "#2C3440",
  lumen: "#F2E9D8", mut: "rgba(242,233,216,0.6)", mut2: "rgba(242,233,216,0.45)",
  amber: "#F2A93B", onAmber: "#412402", coral: "#EE7A70", salvia: "#7FAE96",
};

function Dot({ rep }: { rep: FinderMatch["reputation"] }) {
  const c = rep === "exposed" ? C.amber : C.coral;
  return <span style={{ width: 9, height: 9, borderRadius: "50%", background: c, flex: "none" }} />;
}

function Pill({ children, fg, bg }: { children: React.ReactNode; fg: string; bg: string }) {
  return (
    <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 999, background: bg, color: fg, flex: "none" }}>
      {children}
    </span>
  );
}

function Ghost({ children, onClick, href, disabled }: { children: React.ReactNode; onClick?: () => void; href?: string; disabled?: boolean }) {
  const style: React.CSSProperties = {
    fontSize: 12, padding: "6px 12px", borderRadius: 999, border: `0.5px solid ${C.line}`,
    color: disabled ? C.mut2 : C.lumen, background: "transparent", cursor: disabled ? "default" : "pointer",
    textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5,
  };
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{children}</a>;
  return <button type="button" onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

export function ContentFinder({
  generationId, alias, imageUrl, lastScanAt, matches, allow: allow0,
}: {
  generationId: string;
  alias: string;
  imageUrl: string | null;
  lastScanAt: string | null;
  matches: FinderMatch[];
  allow: AllowEntry[];
}) {
  const router = useRouter();
  const [allow, setAllow] = useState<AllowEntry[]>(allow0);
  const [tab, setTab] = useState<"all" | "review" | "whitelist">("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const asUrls = (m: FinderMatch) => ({ sourceUrl: m.sourceUrl, pageUrl: m.pageUrl, host: m.host });
  const visible = matches.filter((m) => !isWhitelisted(asUrls(m), allow));
  const shown = tab === "review" ? visible.filter((m) => m.band === "review") : visible;

  const runScan = async () => {
    if (busy) return;
    setBusy(true);
    setMsg("Cerco copie sul web...");
    try {
      const r = await fetch("/api/ward/content-scan", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ generationId }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok) { setMsg(`Trovate ${j.matches} copie su ${j.candidates} candidati.`); router.refresh(); }
      else setMsg(j?.error || "Controllo non riuscito.");
    } catch {
      setMsg("Errore di rete.");
    } finally {
      setBusy(false);
    }
  };

  const markSafe = async (m: FinderMatch) => {
    const host = (m.host ?? "").toLowerCase().replace(/^www\./, "");
    // Ottimistico: la riga sparisce subito (la whitelist nasconde).
    setAllow((prev) => [...prev, { type: "host", value: host }]);
    try {
      await fetch("/api/ward/whitelist", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: m.id, scope: "host" }),
      });
    } catch {
      /* in caso di errore resta nascosta in sessione; al refresh ricompare */
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.obsidian, color: C.lumen, fontFamily: "var(--font-ward-display), system-ui, sans-serif" }}>
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "0 14px 40px" }}>

        <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 2px 10px" }}>
          <Link href="/account" style={{ fontSize: 12, color: C.mut, textDecoration: "none" }}>‹ Esci</Link>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: C.amber, color: C.onAmber, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>S</span>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: 1, color: C.mut }}>SEMBLIC</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Ward</div>
            </div>
          </div>
        </header>

        <div style={{ display: "flex", gap: 12, padding: "6px 2px 14px", alignItems: "center" }}>
          <div style={{ width: 62, height: 62, borderRadius: 12, background: C.card, border: `0.5px solid ${C.line}`, overflow: "hidden", flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {imageUrl ? <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: C.mut2, fontSize: 11 }}>img</span>}
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.mut }}>La tua immagine generata</div>
            <div style={{ fontSize: 17, fontWeight: 500, margin: "2px 0 3px" }}>{alias}</div>
            <div style={{ fontSize: 12, color: C.mut }}>
              <span style={{ color: C.amber, fontWeight: 500 }}>{visible.length} copie</span> da vedere
              {lastScanAt ? "" : ", nessun controllo ancora"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, padding: "0 2px 8px", flexWrap: "wrap" }}>
          {([["all", "Tutte"], ["review", "Da rivedere"], ["whitelist", "In whitelist"]] as const).map(([k, label]) => {
            const on = tab === k;
            return (
              <button key={k} type="button" onClick={() => setTab(k)} style={{
                fontSize: 12, padding: "5px 13px", borderRadius: 999, cursor: "pointer",
                background: on ? C.amber : "transparent", color: on ? C.onAmber : C.mut,
                border: on ? "none" : `0.5px solid ${C.line}`, fontWeight: on ? 500 : 400,
              }}>{label}</button>
            );
          })}
          <button type="button" onClick={runScan} disabled={busy} style={{
            marginLeft: "auto", fontSize: 12, padding: "5px 13px", borderRadius: 999, cursor: busy ? "default" : "pointer",
            background: "transparent", color: busy ? C.mut2 : C.lumen, border: `0.5px solid ${C.line}`,
          }}>{busy ? "Controllo..." : (lastScanAt ? "Aggiorna" : "Cerca copie")}</button>
        </div>

        {msg && <div style={{ fontSize: 12, color: C.mut, padding: "2px 2px 10px" }}>{msg}</div>}

        {tab === "whitelist" ? (
          <WhitelistTab allow={allow} />
        ) : shown.length === 0 ? (
          <div style={{ background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 12, padding: "22px 16px", textAlign: "center", color: C.mut, fontSize: 13 }}>
            {lastScanAt ? "Niente da rivedere qui." : "Avvia un controllo per cercare le copie della tua immagine sul web."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {shown.map((m) => <Card key={m.id} m={m} onSafe={() => markSafe(m)} />)}
          </div>
        )}

        <div style={{ fontSize: 10.5, color: C.mut2, lineHeight: 1.5, borderTop: `0.5px solid ${C.line}`, marginTop: 16, paddingTop: 12 }}>
          Ward trova e segnala. Decidi tu cosa fare: nessuna accusa automatica, nessuna cifra. La filigrana invisibile conferma quando una copia e' davvero tua.
        </div>
      </div>
    </div>
  );
}

function Card({ m, onSafe }: { m: FinderMatch; onSafe: () => void }) {
  const confirmed = m.band === "confirmed";
  const repLabel = m.reputation === "exposed" ? "Piattaforma nota" : "Zona nascosta";
  const repColor = m.reputation === "exposed" ? C.amber : C.coral;
  return (
    <div style={{ background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 12, padding: "11px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Dot rep={m.reputation} />
        <span style={{ fontSize: 13, fontWeight: 500, wordBreak: "break-all" }}>{m.host}</span>
        {confirmed
          ? <Pill fg={C.coral} bg="rgba(238,122,112,0.16)">Confermato</Pill>
          : <Pill fg={C.amber} bg="rgba(242,169,59,0.14)">Da rivedere</Pill>}
      </div>
      <div style={{ fontSize: 11, color: C.mut, margin: "7px 0 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{ color: repColor }}>{repLabel}</span>
        <span style={{ color: C.line }}>·</span>
        {m.watermarkPresent
          ? <span style={{ color: C.salvia }}>Filigrana: si, e' tua</span>
          : <span>Filigrana: no</span>}
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <Ghost href={m.pageUrl || m.sourceUrl}>Apri</Ghost>
        <Ghost onClick={onSafe}>Segna sicuro</Ghost>
        <Ghost disabled>Rimozione · presto</Ghost>
      </div>
    </div>
  );
}

function WhitelistTab({ allow }: { allow: AllowEntry[] }) {
  if (allow.length === 0) {
    return (
      <div style={{ background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 12, padding: "22px 16px", textAlign: "center", color: C.mut, fontSize: 13 }}>
        Niente in whitelist. Usa "Segna sicuro" su un risultato per nasconderlo da qui in poi.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {allow.map((a, i) => (
        <div key={i} style={{ background: C.card, border: `0.5px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.salvia, flex: "none" }} />
          <span style={{ fontSize: 13, wordBreak: "break-all" }}>{a.value}</span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: C.mut2 }}>{a.type === "host" ? "tutto il dominio" : "questa pagina"}</span>
        </div>
      ))}
    </div>
  );
}
