"use client";

import { useState } from "react";
import Link from "next/link";

const SHIELD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2.5l7.5 3.2v5.1c0 4.8-3.2 8.3-7.5 9.7-4.3-1.4-7.5-4.9-7.5-9.7V5.7L12 2.5z" /><path d="M9 12l2 2 4-4.2" /></svg>
);

// Passo 1: KYC. In produzione (Didit configurato) apre la verifica reale Didit
// (documento + liveness + face match) e redireziona; al rientro
// (?didit=done) il funnel riprende. In sviluppo (Didit non configurato) usa lo
// stub che segna solo lo stato verificato (POST /api/kyc/stub), 410 in prod.
export function KycStep({ onVerified, diditEnabled, returnTo }: { onVerified: () => void; diditEnabled: boolean; returnTo: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function verify() {
    setBusy(true); setErr(null);
    try {
      if (diditEnabled) {
        // KYC reale: apri la sessione Didit e fatti riportare nel punto giusto del
        // funnel (returnTo dipende dal flusso: entry vs protetto).
        const res = await fetch("/api/kyc/didit/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ returnTo }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.url) { setErr(j.error ?? "Avvio verifica non riuscito."); setBusy(false); return; }
        window.location.href = j.url;
        return;
      }
      // Sviluppo: stub (in prod risponde 410, mai fail-open verso "approved").
      const res = await fetch("/api/kyc/stub", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error ?? "Verifica non riuscita."); setBusy(false); return; }
      onVerified();
    } catch {
      setErr("Errore di rete."); setBusy(false);
    }
  }
  return (
    <div className="wf-card">
      <div className="wf-live" aria-hidden><div className="wf-live-ring" /><div className="wf-live-face" /></div>
      <span className="wf-eyebrow">Passo 1, verifica</span>
      <h2 className="wf-title">Conferma che sei tu</h2>
      <p className="wf-lede">Una verifica veloce (liveness e documento) prova che sei una persona reale e che questo volto e&apos; il tuo. Tiene fuori bot e impostori. Gratis.</p>
      <div className="wf-feats"><span>Liveness</span><span>Documento</span><span>Face match</span></div>
      {err && <p className="wf-err">{err}</p>}
      <button type="button" className="wf-btn" disabled={busy} onClick={verify}>{busy ? (diditEnabled ? "Apro la verifica..." : "Verifica in corso...") : "Verificami gratis"}</button>
    </div>
  );
}

// Passo 1 in attesa: Didit e' asincrono (lo stato vero arriva dal webhook). Al
// rientro dal redirect l'identita' puo' essere ancora "in verifica": mostriamo
// l'attesa invece di rifare il KYC. Appena il webhook approva, il reload riparte
// dal Passo 2.
export function KycPending() {
  return (
    <div className="wf-card">
      <div className="wf-live" aria-hidden><div className="wf-live-ring" /><div className="wf-live-face" /></div>
      <span className="wf-eyebrow">Passo 1, verifica</span>
      <h2 className="wf-title">Verifica in corso</h2>
      <p className="wf-lede">Stiamo confermando la tua identita&apos;. Di solito e&apos; questione di un minuto. Appena e&apos; fatta puoi aggiungere le foto del volto e attivare Ward.</p>
      <button type="button" className="wf-btn" onClick={() => window.location.reload()}>Ho completato, ricarica</button>
    </div>
  );
}

// Passo consenso Ward: scope + on-match + durata + sensibili-always-on + Art.9.
// Attiva il monitoraggio (POST /api/ward/activate). Spec F3.
export function WardConsentStep({ onActivated }: { onActivated: () => void }) {
  const [onMatch, setOnMatch] = useState<"notify" | "auto">("notify");
  const [months, setMonths] = useState<6 | 12>(12);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function activate() {
    if (!agree) { setErr("Spunta il consenso per attivare Ward."); return; }
    setBusy(true); setErr(null);
    const res = await fetch("/api/ward/activate", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ onMatch, months }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(j.error ?? "Attivazione non riuscita."); setBusy(false); return; }
    onActivated();
  }
  return (
    <div className="wf-card">
      <span className="wf-eyebrow">La chiave legale</span>
      <h2 className="wf-title">Consenso al monitoraggio</h2>
      <p className="wf-lede">Permetti a Ward di cercare il tuo volto sul web aperto, confrontandolo solo col tuo riferimento.</p>

      <div className="wf-crows">
        <div className="wf-crow"><div className="wf-crow-t">Scansione del web aperto</div><div className="wf-crow-m">solo il tuo volto, mai quello di altri.</div></div>
        <div className="wf-crow"><div className="wf-crow-t">Match solo col tuo riferimento</div><div className="wf-crow-m">il tuo template biometrico e basta. Nessun altro volto viene indicizzato.</div></div>
      </div>

      <div className="wf-row">
        <div><div className="wf-row-t">Su un match</div><div className="wf-row-m">ti avviso prima, oppure Nemesis prepara il takedown.</div></div>
        <div className="wf-seg">
          <button type="button" className={onMatch === "notify" ? "on" : ""} onClick={() => setOnMatch("notify")}>Avvisami</button>
          <button type="button" className={onMatch === "auto" ? "on" : ""} onClick={() => setOnMatch("auto")}>Auto</button>
        </div>
      </div>
      <div className="wf-row">
        <div><div className="wf-row-t">Protezione contenuti sensibili</div><div className="wf-row-m">sempre attiva, non disattivabile.</div></div>
        <div className="wf-toggle on locked" aria-hidden />
      </div>
      <div className="wf-row">
        <div><div className="wf-row-t">Durata del consenso</div><div className="wf-row-m">rinnovabile, revocabile in ogni momento.</div></div>
        <div className="wf-seg">
          <button type="button" className={months === 6 ? "on" : ""} onClick={() => setMonths(6)}>6 mesi</button>
          <button type="button" className={months === 12 ? "on" : ""} onClick={() => setMonths(12)}>12 mesi</button>
        </div>
      </div>

      <div className="wf-legal">Consenso esplicito al trattamento del dato biometrico (GDPR Art.9). Puoi revocarlo in ogni momento: ferma subito ogni scansione e resta registrato. Testi in revisione legale.</div>
      <label className="wf-agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>Acconsento al monitoraggio del mio volto come descritto e confermo che e&apos; mio.</span>
      </label>
      {err && <p className="wf-err">{err}</p>}
      <button type="button" className="wf-btn salvia" disabled={busy} onClick={activate}>{busy ? "Attivo..." : "Concedi il consenso e attiva"}</button>
    </div>
  );
}

// Schermata finale: Ward attivo.
export function WardActive() {
  return (
    <div className="wf-card wf-success">
      <div className="wf-shield">{SHIELD}</div>
      <h2 className="wf-title">Ward e&apos; attivo</h2>
      <p className="wf-lede">La prima scansione e&apos; gia&apos; partita. Ti avvisiamo appena troviamo qualcosa, e Nemesis e&apos; pronto nel momento in cui vuoi colpire. Sei protetto.</p>
      <Link href="/ward" className="wf-btn">Apri Ward</Link>
    </div>
  );
}
