"use client";
import { useEffect, useState } from "react";
import { X, FileDown, Send, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import type { DmcaNotice } from "@/lib/ward/takedown";
import { downloadDmcaPdf } from "./dmca-pdf";
import { NemesisMark } from "./NemesisMark";

// Gradiente "tramonto" (amber->coral): l'identita' di Nemesis, lo strike.
const TRAMONTO = "linear-gradient(135deg,#F2A93B 0%,#EE7A70 100%)";
const wordmark = { background: TRAMONTO, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } as const;

// Pannello Nemesis (rimozione DMCA assistita) per UNA copia confermata. A gradini:
// profilo (una volta) -> documento (anteprima + PDF) -> tracking (inviata ->
// ricontrollo). Semblic prepara, l'utente invia: nessun invio automatico, disclaimer
// "non e' consulenza legale" sempre presente. Token SEMBLIC, mobile = desktop.

type Step = "loading" | "profile" | "doc" | "error";
type Status = "drafted" | "sent" | "removed" | "online";

export function Takedown({ matchId, host, onClose }: { matchId: string; host: string | null; onClose: () => void }) {
  const [step, setStep] = useState<Step>("loading");
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<DmcaNotice | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("drafted");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", address: "", email: "" });

  const start = async () => {
    setStep("loading"); setErr(null);
    try {
      const r = await fetch("/api/ward/takedown", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const j = await r.json().catch(() => null);
      if (r.status === 409 && j?.needsProfile) { setStep("profile"); return; }
      if (r.ok && j?.ok) {
        setNotice(j.notice); setActionId(j.actionId); setStatus(j.status); setStep("doc"); return;
      }
      setErr(j?.error || "Preparazione non riuscita."); setStep("error");
    } catch { setErr("Errore di rete."); setStep("error"); }
  };

  useEffect(() => { start(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const saveProfile = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/ward/takedown-profile", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok) { await start(); } else setErr(j?.error || "Salvataggio non riuscito.");
    } catch { setErr("Errore di rete."); } finally { setBusy(false); }
  };

  const track = async (event: "send" | "recheck") => {
    if (busy || !actionId) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/ward/takedown/status", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ actionId, event }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok) setStatus(j.status as Status); else setErr(j?.error || "Aggiornamento non riuscito.");
    } catch { setErr("Errore di rete."); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-obsidian-2 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] text-[#2a1404]" style={{ background: TRAMONTO }}>
            <NemesisMark className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-bold leading-none tracking-[0.18em]" style={wordmark}>NEMESIS</div>
            {host && <div className="mt-1 truncate text-xs text-muted">{host}</div>}
          </div>
          <button type="button" onClick={onClose} className="ml-auto text-muted transition-colors hover:text-foreground"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === "loading" && (
            <div className="flex items-center gap-2 py-10 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Preparo la richiesta...
            </div>
          )}

          {step === "error" && (
            <div className="py-8 text-center">
              <AlertTriangle className="mx-auto h-7 w-7" style={{ color: "#EE7A70" }} />
              <p className="mt-3 text-sm text-muted">{err}</p>
              <button type="button" onClick={start} className="mt-4 rounded-full border border-border px-4 py-2 text-xs transition-colors hover:bg-obsidian-3">Riprova</button>
            </div>
          )}

          {step === "profile" && (
            <div>
              <p className="text-sm font-medium">Una volta sola: i tuoi dati per la richiesta</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">Servono nella DMCA notice (chi richiede la rimozione). Restano privati e li riusiamo per le prossime.</p>
              <div className="mt-4 flex flex-col gap-2.5">
                <Field label="Nome e cognome" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
                <Field label="Indirizzo" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
              </div>
              {err && <p className="mt-2 text-xs" style={{ color: "#EE7A70" }}>{err}</p>}
              <button
                type="button" onClick={saveProfile} disabled={busy}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#F2A93B] px-5 py-2.5 text-xs font-bold text-[#412402] transition-[filter] hover:brightness-110 disabled:opacity-60"
              >{busy ? "Salvo..." : "Continua"}</button>
            </div>
          )}

          {step === "doc" && notice && (
            <div>
              <div className="rounded-xl border border-border bg-obsidian-3 px-3.5 py-3">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Da inviare a</div>
                <div className="mt-0.5 text-sm">{notice.to}</div>
              </div>

              <div className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Anteprima del documento</div>
              <pre className="mt-1.5 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-obsidian px-3.5 py-3 text-[11px] leading-relaxed text-foreground/90">{notice.body}</pre>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button" onClick={() => downloadDmcaPdf(notice, host)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F2A93B] px-4 py-2 text-xs font-bold text-[#412402] transition-[filter] hover:brightness-110"
                ><FileDown className="h-3.5 w-3.5" /> Scarica PDF</button>
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Tracciamento</div>
                <StatusRow status={status} />
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {status === "drafted" && (
                    <button type="button" onClick={() => track("send")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs transition-colors hover:bg-obsidian-3 disabled:opacity-60">
                      <Send className="h-3 w-3" /> Ho inviato la richiesta
                    </button>
                  )}
                  {(status === "sent" || status === "online") && (
                    <button type="button" onClick={() => track("recheck")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs transition-colors hover:bg-obsidian-3 disabled:opacity-60">
                      <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} /> Ricontrolla la copia
                    </button>
                  )}
                </div>
                {err && <p className="mt-2 text-xs" style={{ color: "#EE7A70" }}>{err}</p>}
              </div>

              <p className="mt-5 text-[10.5px] leading-relaxed text-faint">
                Questo documento non e&apos; consulenza legale. Semblic prepara la richiesta, l&apos;invio spetta a te.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-obsidian px-3 py-2 text-sm outline-none transition-colors focus:border-[#F2A93B]"
      />
    </label>
  );
}

function StatusRow({ status }: { status: Status }) {
  const map: Record<Status, { label: string; color: string }> = {
    drafted: { label: "Bozza pronta", color: "#F2A93B" },
    sent: { label: "Inviata, in attesa", color: "#F2A93B" },
    removed: { label: "Rimossa", color: "#7FAE96" },
    online: { label: "Ancora online", color: "#EE7A70" },
  };
  const s = map[status];
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <span className="h-2 w-2 flex-none rounded-full" style={{ background: s.color }} />
      <span className="text-sm font-medium" style={{ color: s.color }}>{s.label}</span>
    </div>
  );
}
