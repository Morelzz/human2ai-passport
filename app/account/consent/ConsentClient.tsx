"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IDENTITY_KIT, IDENTITY_LABELS } from "@/lib/types";

interface Props {
  handle: string;
  commercialConsent: boolean;
  revokedAt: string | null;
  availableForBooking: boolean;
  protectionOnly?: boolean;
  kit: Record<keyof typeof IDENTITY_KIT, string | null>;
}

export default function ConsentClient({ handle, commercialConsent, revokedAt, availableForBooking, protectionOnly = false, kit }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(availableForBooking);
  const [consent, setConsent] = useState(commercialConsent);

  async function toggleBooking() {
    const next = !booking;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/avatar/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: next }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    setBooking(next);
  }

  async function setCommercialConsent(next: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/avatar/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "set_commercial_consent", value: next }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    setConsent(next);
    router.refresh();
  }

  async function act(body: object) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/avatar/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    router.refresh();
  }

  return (
      <section style={{ maxWidth: 540, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "0 0 0.5rem" }}>Gestisci il consenso</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
          Il consenso è una timeline: ogni modifica viene registrata e vale solo per il
          futuro. Revocare non cancella ciò che è già avvenuto.{" "}
          <Link href={`/passport/${handle}`} style={{ color: "#F2A93B" }}>Vedi il passport →</Link>
        </p>

        {/* Identity kit — immutabile, fissato alla creazione */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0 0 0.3rem" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", letterSpacing: "0.06em", margin: 0 }}>IDENTITY KIT</p>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#F2A93B", background: "rgba(242,169,59,0.12)", border: "1px solid rgba(242,169,59,0.3)", borderRadius: 999, padding: "0.1rem 0.5rem", letterSpacing: "0.04em" }}>IMMUTABILE</span>
          </div>
          <p style={{ color: "var(--text-faint)", fontSize: "0.72rem", margin: "0 0 1.2rem", lineHeight: 1.5 }}>
            Le caratteristiche strutturali dell&apos;avatar, fissate alla creazione. Rappresentano la persona reale e non sono modificabili.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
            {(Object.keys(IDENTITY_KIT) as (keyof typeof IDENTITY_KIT)[]).map((field) => (
              <div key={field}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.68rem", letterSpacing: "0.03em", margin: "0 0 0.2rem" }}>{IDENTITY_LABELS[field]}</p>
                <p style={{ color: "var(--text)", fontSize: "0.85rem", fontWeight: 600, margin: 0, textTransform: "capitalize" }}>{kit[field] ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {error && <p style={{ color: "var(--blocked-c)", fontSize: "0.85rem" }}>{error}</p>}

        {revokedAt ? (
          <div style={{ background: "rgba(238,122,112,0.08)", border: "1px solid rgba(238,122,112,0.3)", borderRadius: 16, padding: "1.5rem" }}>
            <p style={{ color: "var(--blocked-c)", fontWeight: 700, margin: "0 0 0.4rem" }}>Consenso revocato</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0 0 1.2rem", lineHeight: 1.6 }}>
              Dal {new Date(revokedAt).toLocaleDateString("it-IT")} il tuo avatar è escluso da ogni nuovo utilizzo.
              Puoi riattivare il consenso: il futuro torna disponibile, ma la cronologia
              della revoca resta registrata.
            </p>
            <button disabled={busy} onClick={() => { if (confirm("Riattivare il consenso? Il tuo avatar tornerà utilizzabile da oggi.")) act({ type: "reactivate" }); }}
              style={{ padding: "0.7rem 1.2rem", borderRadius: 10, border: "none", background: busy ? "var(--elevated)" : "#F2A93B", color: "#412402", fontWeight: 700, fontSize: "0.85rem", cursor: busy ? "default" : "pointer" }}>
              Riattiva il consenso
            </button>
          </div>
        ) : (
          <>
            {/* Uso commerciale: consenso sì/no (modello senza categorie) */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.2rem" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", letterSpacing: "0.06em", margin: "0 0 0.3rem" }}>USO COMMERCIALE</p>
              <p style={{ color: "var(--text-faint)", fontSize: "0.72rem", margin: "0 0 1rem", lineHeight: 1.5 }}>
                Decidi se il tuo volto può essere usato per generazioni commerciali. È un sì o no, niente più categorie. Vale solo per il futuro.
              </p>
              <button type="button" role="switch" aria-checked={consent} disabled={busy} onClick={() => setCommercialConsent(!consent)}
                style={{ display: "flex", alignItems: "center", gap: "0.8rem", width: "100%", background: "transparent", border: "none", cursor: busy ? "default" : "pointer", textAlign: "left", padding: 0 }}>
                <span style={{ flex: "none", width: 40, height: 23, borderRadius: 999, background: consent ? "var(--verified-c)" : "var(--hairline)", position: "relative", transition: "background 0.15s" }}>
                  <span style={{ position: "absolute", top: 2, left: consent ? 19 : 2, width: 19, height: 19, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
                </span>
                <span>
                  <span style={{ display: "block", color: "var(--text)", fontSize: "0.85rem", fontWeight: 600 }}>Uso commerciale: {consent ? "consentito" : "non consentito"}</span>
                  <span style={{ display: "block", color: "var(--text-faint)", fontSize: "0.72rem", marginTop: "0.2rem", lineHeight: 1.5 }}>Puoi cambiare idea quando vuoi: blocca gli usi futuri, non il passato.</span>
                </span>
              </button>
            </div>

            {/* Ingaggi reali (B3): segnale opt-in. Il brand contatta via /contatti.
                Nascosto per i volti in sola protezione (VETO). */}
            {!protectionOnly && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.2rem" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", letterSpacing: "0.06em", margin: "0 0 0.3rem" }}>INGAGGI REALI</p>
                <p style={{ color: "var(--text-faint)", fontSize: "0.72rem", margin: "0 0 1rem", lineHeight: 1.5 }}>
                  Permetti ai brand di contattarti, tramite Semblic, per uno shooting reale con la persona vera. Appare un badge sul tuo passport. Il consenso non cambia.
                </p>
                <button disabled={busy} onClick={toggleBooking}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.9rem", borderRadius: 999, fontSize: "0.82rem", fontWeight: 700, cursor: busy ? "default" : "pointer", background: booking ? "rgba(127,174,150,0.12)" : "var(--surface)", color: booking ? "var(--verified-c)" : "var(--text-muted)", border: booking ? "1px solid rgba(127,174,150,0.3)" : "1px solid var(--hairline-soft)" }}>
                  {booking ? "✓ Disponibile per ingaggi reali" : "Attiva: disponibile per ingaggi reali"}
                </button>
              </div>
            )}

            {/* Kill-switch */}
            <div style={{ background: "rgba(238,122,112,0.05)", border: "1px solid rgba(238,122,112,0.25)", borderRadius: 16, padding: "1.5rem" }}>
              <p style={{ color: "var(--text)", fontWeight: 700, fontSize: "0.9rem", margin: "0 0 0.4rem" }}>Revoca totale</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.6, margin: "0 0 1rem" }}>
                Esclude il tuo avatar da ogni utilizzo futuro. Azione prospettica e definitiva.
              </p>
              <button disabled={busy} onClick={() => { if (confirm("Revocare tutto il consenso? Il tuo avatar non sarà più utilizzabile.")) act({ type: "revoke_all" }); }}
                style={{ padding: "0.7rem 1.2rem", borderRadius: 10, background: "transparent", border: "1px solid var(--blocked-c)", color: "var(--blocked-c)", fontWeight: 700, fontSize: "0.85rem", cursor: busy ? "default" : "pointer" }}>
                Revoca tutto il consenso
              </button>
            </div>
          </>
        )}
      </section>
  );
}
