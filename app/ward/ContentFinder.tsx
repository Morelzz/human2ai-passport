"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScanSearch, ShieldCheck, ExternalLink, BadgeCheck, Eye, Gavel } from "lucide-react";
import { isWhitelisted, type AllowEntry } from "@/lib/ward/whitelist";
import { Takedown } from "./Takedown";

// Schermata Ward v2 (content leak finder): per una NOSTRA immagine generata,
// mostra le copie trovate sul web. Immagine GRANDE (a lato su desktop, in cima su
// mobile), card curate con miniatura della copia (via proxy sicuro), semaforo di
// reputazione + filigrana, e un empty-state che rassicura quando non c'e' nulla
// (lo 0 e' una buona notizia). La whitelist NASCONDE: "Segna sicuro" toglie la
// riga. Nessuna cifra, nessuna accusa. Logo SEMBLIC in alto.

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

const LOGO_MASK = "radial-gradient(circle,#000 62%,transparent 84%)";

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
  const [takedown, setTakedown] = useState<FinderMatch | null>(null);

  const asUrls = (m: FinderMatch) => ({ sourceUrl: m.sourceUrl, pageUrl: m.pageUrl, host: m.host });
  const visible = matches.filter((m) => !isWhitelisted(asUrls(m), allow));
  const review = visible.filter((m) => m.band === "review");
  const shown = tab === "review" ? review : visible;

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
      if (r.ok && j?.ok) {
        setMsg(j.matches > 0 ? `Trovate ${j.matches} copie.` : "Nessuna copia trovata.");
        router.refresh();
      } else setMsg(j?.error || "Controllo non riuscito.");
    } catch {
      setMsg("Errore di rete.");
    } finally {
      setBusy(false);
    }
  };

  const markSafe = async (m: FinderMatch) => {
    const host = (m.host ?? "").toLowerCase().replace(/^www\./, "");
    setAllow((prev) => [...prev, { type: "host", value: host }]);
    try {
      await fetch("/api/ward/whitelist", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: m.id, scope: "host" }),
      });
    } catch { /* resta nascosta in sessione; al refresh ricompare */ }
  };

  return (
    <div className="min-h-screen bg-obsidian text-foreground">
      <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">

        <header className="flex items-center gap-2 py-4">
          <Link href="/account" className="text-sm text-muted transition-colors hover:text-foreground">‹ Esci</Link>
          <div className="ml-auto flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/semblic-mark.png" alt="" aria-hidden className="h-6 w-6 object-contain" style={{ maskImage: LOGO_MASK, WebkitMaskImage: LOGO_MASK }} />
            <span className="text-sm font-medium tracking-[0.12em]">WARD</span>
          </div>
        </header>

        <div className="grid gap-6 sm:grid-cols-[minmax(0,290px)_1fr] sm:gap-8">

          {/* Immagine GRANDE (a lato su desktop, in cima su mobile) */}
          <div className="sm:sticky sm:top-4 sm:self-start">
            <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-obsidian-2" style={{ aspectRatio: "4 / 5" }}>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={alias} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-faint"><Eye className="h-8 w-8" /></div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-obsidian/95 to-transparent p-3.5">
                <div className="text-[10px] font-medium tracking-[0.16em] text-muted">LA TUA IMMAGINE GENERATA</div>
                <div className="mt-0.5 text-lg font-semibold leading-tight">{alias}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted">{lastScanAt ? "Controllata" : "Mai controllata"}</span>
              <button
                type="button" onClick={runScan} disabled={busy}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#F2A93B] px-4 py-2 text-xs font-bold text-[#412402] transition-[filter] hover:brightness-110 disabled:opacity-60"
              >
                <ScanSearch className="h-3.5 w-3.5" />
                {busy ? "Controllo..." : lastScanAt ? "Aggiorna" : "Cerca copie"}
              </button>
            </div>
            {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
          </div>

          {/* Colonna risultati */}
          <div>
            <div className="flex flex-wrap gap-2 pb-3">
              <Tab on={tab === "all"} onClick={() => setTab("all")}>Tutte {visible.length}</Tab>
              <Tab on={tab === "review"} onClick={() => setTab("review")}>Da rivedere {review.length}</Tab>
              <Tab on={tab === "whitelist"} onClick={() => setTab("whitelist")}>In whitelist {allow.length}</Tab>
            </div>

            {tab === "whitelist" ? (
              <WhitelistTab allow={allow} />
            ) : shown.length === 0 ? (
              <EmptyState scanned={!!lastScanAt} />
            ) : (
              <div className="flex flex-col gap-2.5">
                {shown.map((m) => <Card key={m.id} m={m} onSafe={() => markSafe(m)} onTakedown={() => setTakedown(m)} />)}
              </div>
            )}

            <p className="mt-8 max-w-md text-[11px] leading-relaxed text-faint">
              Ward trova e segnala. Decidi tu cosa fare: nessuna accusa automatica, nessuna cifra. La filigrana invisibile conferma quando una copia e&apos; davvero tua.
            </p>
          </div>
        </div>
      </div>

      {takedown && (
        <Takedown matchId={takedown.id} host={takedown.host} onClose={() => setTakedown(null)} />
      )}
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
        on ? "bg-violet text-white" : "border border-border text-muted hover:text-foreground"
      }`}
    >{children}</button>
  );
}

function Card({ m, onSafe, onTakedown }: { m: FinderMatch; onSafe: () => void; onTakedown: () => void }) {
  const [imgOk, setImgOk] = useState(true);
  const confirmed = m.band === "confirmed";
  const exposed = m.reputation === "exposed";
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-obsidian-2 p-2.5">
      <div className="relative h-[58px] w-[58px] flex-none overflow-hidden rounded-xl border border-border bg-obsidian-3">
        {imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/ward/preview/${m.id}`} alt="" className="h-full w-full object-cover" onError={() => setImgOk(false)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-faint"><Eye className="h-4 w-4" /></div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 flex-none rounded-full" style={{ background: exposed ? "#F2A93B" : "#EE7A70" }} />
          <span className="truncate text-[13px] font-medium">{m.host}</span>
          <span
            className="ml-auto flex-none rounded-full px-2 py-[3px] text-[9.5px] font-semibold"
            style={confirmed ? { background: "rgba(238,122,112,0.16)", color: "#EE7A70" } : { background: "rgba(242,169,59,0.14)", color: "#F2A93B" }}
          >{confirmed ? "Confermato" : "Da rivedere"}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px]">
          {m.watermarkPresent ? (
            <span className="inline-flex items-center gap-1" style={{ color: "#7FAE96" }}><BadgeCheck className="h-3 w-3" /> Filigrana: e&apos; tua</span>
          ) : (
            <span className="text-muted">{exposed ? "Piattaforma nota" : "Zona nascosta"} · Filigrana: no</span>
          )}
        </div>
        <div className="mt-2 flex gap-1.5">
          <a href={m.pageUrl || m.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] transition-colors hover:bg-obsidian-3">
            <ExternalLink className="h-3 w-3" /> Apri
          </a>
          <button type="button" onClick={onSafe} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] transition-colors hover:bg-obsidian-3">
            <ShieldCheck className="h-3 w-3" /> Segna sicuro
          </button>
          {confirmed && (
            <button
              type="button" onClick={onTakedown}
              className="inline-flex items-center gap-1 rounded-full bg-[#F2A93B] px-2.5 py-1 text-[11px] font-bold text-[#412402] transition-[filter] hover:brightness-110"
            >
              <Gavel className="h-3 w-3" /> Avvia rimozione
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ scanned }: { scanned: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <ShieldCheck className="mx-auto h-7 w-7" style={{ color: "#7FAE96" }} />
      <div className="mt-3 text-sm font-medium">{scanned ? "Nessuna copia trovata" : "Non hai ancora controllato"}</div>
      <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted">
        {scanned
          ? "La tua immagine non risulta copiata sul web, ed e' una buona notizia. Ward la ricontrolla quando vuoi."
          : "Avvia un controllo: Ward cerca su tutto il web le copie di questa immagine."}
      </p>
    </div>
  );
}

function WhitelistTab({ allow }: { allow: AllowEntry[] }) {
  if (allow.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted">
        Niente in whitelist. Usa &ldquo;Segna sicuro&rdquo; su un risultato per nasconderlo da qui in poi.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {allow.map((a, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-xl border border-border bg-obsidian-2 px-3 py-2.5">
          <span className="h-2 w-2 flex-none rounded-full" style={{ background: "#7FAE96" }} />
          <span className="truncate text-[13px]">{a.value}</span>
          <span className="ml-auto flex-none text-[10px] text-faint">{a.type === "host" ? "tutto il dominio" : "questa pagina"}</span>
        </div>
      ))}
    </div>
  );
}
