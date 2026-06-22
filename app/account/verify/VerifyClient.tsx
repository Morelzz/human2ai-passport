"use client";

import { useState } from "react";
import Link from "next/link";

// VERIFICA IDENTITA' — percorso UNICO: KYC tramite il nostro sistema (Didit).
// Niente piu' caricamento manuale dei documenti: la persona si verifica solo
// cosi'. Le foto del volto (avatar / protezione Ward) si caricano DOPO, nei
// rispettivi flussi, e saranno confrontate col volto verificato qui.
export default function VerifyClient({ initialStatus, diditEnabled = false }: { initialStatus: string; diditEnabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const approved = initialStatus === "approved";
  const inReview = initialStatus === "pending";

  // Avvia la verifica: apre una sessione Didit e ci redireziona. L'esito
  // (approved/rejected) torna dal webhook firmato; al rientro il profilo e' gia'
  // "in verifica" e qui si vede la schermata d'attesa.
  async function startVerification() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/kyc/didit/start", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.url) {
        setErr(j.error ?? "Avvio verifica non riuscito");
        setBusy(false);
        return;
      }
      window.location.href = j.url;
    } catch {
      setErr("Errore di rete");
      setBusy(false);
    }
  }

  if (approved) {
    return (
      <section className="mx-auto max-w-md px-5 py-14 sm:px-8">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-lg font-extrabold text-teal">✓ Identità verificata</p>
          <p className="mt-2 text-sm text-muted">Sei un creatore verificato. Ora puoi creare il tuo avatar nel registro.</p>
          <Link href="/account/avatar" className="mt-6 inline-block rounded-xl bg-[#F2A93B] px-6 py-3 text-sm font-bold text-[#412402] transition-all hover:brightness-110">
            Crea il tuo avatar →
          </Link>
        </div>
      </section>
    );
  }

  if (inReview) {
    return (
      <section className="mx-auto max-w-md px-5 py-14 sm:px-8">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-lg font-extrabold text-violet-light">● In verifica</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Stiamo verificando la tua identità. Appena è confermata te lo diciamo e potrai creare il tuo avatar.
          </p>
          <Link href="/account" className="mt-6 inline-block text-sm text-violet-light hover:underline">← Torna all&apos;account</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-5 py-14 sm:px-8">
      <span className="text-xs font-bold tracking-[0.14em] text-teal">VERIFICA IDENTITÀ</span>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Verifica la tua identità</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Per entrare nel registro confermiamo che sei una persona reale e che il volto è il tuo.
        I tuoi dati restano <span className="text-foreground">privati</span>, usati solo per la verifica.
      </p>

      {diditEnabled ? (
        <div className="glass mt-8 rounded-2xl p-6">
          <p className="text-sm leading-relaxed text-muted">
            Bastano un <span className="text-foreground">documento d&apos;identità</span> e un <span className="text-foreground">selfie con controllo di vivenza</span>: ti guidiamo passo passo, in un minuto. Niente da caricare a mano.
          </p>
          <button
            type="button"
            onClick={startVerification}
            disabled={busy}
            className="mt-5 w-full rounded-xl bg-[#F2A93B] px-6 py-3.5 text-sm font-bold text-[#412402] shadow-[0_8px_40px_rgba(242,169,59,0.35)] transition-all hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Apro la verifica…" : "Verifica la mia identità →"}
          </button>
          {err && <p className="mt-3 text-sm text-crimson">{err}</p>}
          <p className="mt-4 text-xs leading-relaxed text-faint">
            Procedendo dichiari di essere la persona rappresentata e acconsenti alla verifica della tua identità.
          </p>
        </div>
      ) : (
        <div className="glass mt-8 rounded-2xl p-6">
          <p className="text-sm leading-relaxed text-muted">
            La verifica d&apos;identità non è al momento disponibile. Riprova tra poco.
          </p>
        </div>
      )}
    </section>
  );
}
