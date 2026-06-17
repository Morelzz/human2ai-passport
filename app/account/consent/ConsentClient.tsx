"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES, IDENTITY_KIT, IDENTITY_LABELS } from "@/lib/types";

interface Props {
  handle: string;
  approved: string[];
  excluded: string[];
  revokedAt: string | null;
  availableForBooking: boolean;
  protectionOnly?: boolean;
  kit: Record<keyof typeof IDENTITY_KIT, string | null>;
}

export default function ConsentClient({ handle, approved, excluded, revokedAt, availableForBooking, protectionOnly = false, kit }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(availableForBooking);

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
  // Disponibili per essere consentite: né già consentite né escluse
  const available = (CATEGORIES as readonly string[]).filter((c) => !approved.includes(c) && !excluded.includes(c));
  // Disponibili per essere escluse: non già escluse
  const availableToExclude = (CATEGORIES as readonly string[]).filter((c) => !excluded.includes(c));

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
        <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
          Il consenso è una timeline: ogni modifica viene registrata e vale solo per il
          futuro. Revocare non cancella ciò che è già avvenuto.{" "}
          <Link href={`/passport/${handle}`} style={{ color: "#F2A93B" }}>Vedi il passport →</Link>
        </p>

        {/* Identity kit — immutabile, fissato alla creazione */}
        <div style={{ background: "#11141D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0 0 0.3rem" }}>
            <p style={{ color: "#6b7280", fontSize: "0.78rem", letterSpacing: "0.06em", margin: 0 }}>IDENTITY KIT</p>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#F2A93B", background: "rgba(242,169,59,0.12)", border: "1px solid rgba(242,169,59,0.3)", borderRadius: 999, padding: "0.1rem 0.5rem", letterSpacing: "0.04em" }}>IMMUTABILE</span>
          </div>
          <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0 0 1.2rem", lineHeight: 1.5 }}>
            Le caratteristiche strutturali dell&apos;avatar, fissate alla creazione. Rappresentano la persona reale e non sono modificabili.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
            {(Object.keys(IDENTITY_KIT) as (keyof typeof IDENTITY_KIT)[]).map((field) => (
              <div key={field}>
                <p style={{ color: "#6b7280", fontSize: "0.68rem", letterSpacing: "0.03em", margin: "0 0 0.2rem" }}>{IDENTITY_LABELS[field]}</p>
                <p style={{ color: "#F2E9D8", fontSize: "0.85rem", fontWeight: 600, margin: 0, textTransform: "capitalize" }}>{kit[field] ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {error && <p style={{ color: "#B8005C", fontSize: "0.85rem" }}>{error}</p>}

        {revokedAt ? (
          <div style={{ background: "rgba(184,0,92,0.08)", border: "1px solid rgba(184,0,92,0.3)", borderRadius: 16, padding: "1.5rem" }}>
            <p style={{ color: "#B8005C", fontWeight: 700, margin: "0 0 0.4rem" }}>Consenso revocato</p>
            <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0 0 1.2rem", lineHeight: 1.6 }}>
              Dal {new Date(revokedAt).toLocaleDateString("it-IT")} il tuo avatar è escluso da ogni nuovo utilizzo.
              Puoi riattivare il consenso: il futuro torna disponibile, ma la cronologia
              della revoca resta registrata.
            </p>
            <button disabled={busy} onClick={() => { if (confirm("Riattivare il consenso? Il tuo avatar tornerà utilizzabile da oggi.")) act({ type: "reactivate" }); }}
              style={{ padding: "0.7rem 1.2rem", borderRadius: 10, border: "none", background: busy ? "#374151" : "linear-gradient(135deg,#F2A93B,#00A896)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: busy ? "default" : "pointer" }}>
              Riattiva il consenso
            </button>
          </div>
        ) : (
          <>
            {/* Categorie consentite */}
            <div style={{ background: "#11141D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.2rem" }}>
              <p style={{ color: "#6b7280", fontSize: "0.78rem", letterSpacing: "0.06em", margin: "0 0 1rem" }}>CATEGORIE CONSENTITE</p>
              {approved.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: 0 }}>Nessuna categoria attiva.</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {approved.map((c) => (
                    <button key={c} disabled={busy} onClick={() => act({ type: "remove_category", category: c })}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.7rem", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600, background: "rgba(0,168,150,0.12)", color: "#00A896", border: "1px solid rgba(0,168,150,0.3)", cursor: busy ? "default" : "pointer" }}>
                      {c} <span style={{ color: "#B8005C", fontWeight: 800 }}>×</span>
                    </button>
                  ))}
                </div>
              )}
              <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0.8rem 0 0" }}>Clicca una categoria per revocarla.</p>
            </div>

            {/* Aggiungi categoria */}
            {available.length > 0 && (
              <div style={{ background: "#11141D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.2rem" }}>
                <p style={{ color: "#6b7280", fontSize: "0.78rem", letterSpacing: "0.06em", margin: "0 0 1rem" }}>AGGIUNGI CATEGORIA</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {available.map((c) => (
                    <button key={c} disabled={busy} onClick={() => act({ type: "add_category", category: c })}
                      style={{ padding: "0.35rem 0.7rem", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600, background: "#161A24", color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)", cursor: busy ? "default" : "pointer" }}>
                      + {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categorie escluse */}
            <div style={{ background: "#11141D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.2rem" }}>
              <p style={{ color: "#6b7280", fontSize: "0.78rem", letterSpacing: "0.06em", margin: "0 0 0.3rem" }}>CATEGORIE ESCLUSE</p>
              <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0 0 1rem" }}>Usi che vieti esplicitamente, qualunque cosa accada.</p>
              {excluded.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                  {excluded.map((c) => (
                    <button key={c} disabled={busy} onClick={() => act({ type: "remove_excluded", category: c })}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.7rem", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600, background: "rgba(184,0,92,0.12)", color: "#B8005C", border: "1px solid rgba(184,0,92,0.3)", cursor: busy ? "default" : "pointer" }}>
                      {c} <span style={{ fontWeight: 800 }}>×</span>
                    </button>
                  ))}
                </div>
              )}
              {availableToExclude.length > 0 && (
                <>
                  <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0 0 0.6rem" }}>Aggiungi un&apos;esclusione:</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {availableToExclude.map((c) => (
                      <button key={c} disabled={busy} onClick={() => act({ type: "add_excluded", category: c })}
                        style={{ padding: "0.35rem 0.7rem", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600, background: "#161A24", color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)", cursor: busy ? "default" : "pointer" }}>
                        ⊘ {c}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0.8rem 0 0" }}>Clicca un&apos;esclusione per rimuoverla. Escludere una categoria la toglie dalle consentite.</p>
            </div>

            {/* Ingaggi reali (B3): segnale opt-in. Il brand contatta via /contatti.
                Nascosto per i volti in sola protezione (VETO). */}
            {!protectionOnly && (
              <div style={{ background: "#11141D", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.2rem" }}>
                <p style={{ color: "#6b7280", fontSize: "0.78rem", letterSpacing: "0.06em", margin: "0 0 0.3rem" }}>INGAGGI REALI</p>
                <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0 0 1rem", lineHeight: 1.5 }}>
                  Permetti ai brand di contattarti, tramite Semblic, per uno shooting reale con la persona vera. Appare un badge sul tuo passport. Il consenso non cambia.
                </p>
                <button disabled={busy} onClick={toggleBooking}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.9rem", borderRadius: 999, fontSize: "0.82rem", fontWeight: 700, cursor: busy ? "default" : "pointer", background: booking ? "rgba(0,168,150,0.12)" : "#161A24", color: booking ? "#00A896" : "#6b7280", border: booking ? "1px solid rgba(0,168,150,0.3)" : "1px solid rgba(255,255,255,0.08)" }}>
                  {booking ? "✓ Disponibile per ingaggi reali" : "Attiva: disponibile per ingaggi reali"}
                </button>
              </div>
            )}

            {/* Kill-switch */}
            <div style={{ background: "rgba(184,0,92,0.05)", border: "1px solid rgba(184,0,92,0.25)", borderRadius: 16, padding: "1.5rem" }}>
              <p style={{ color: "#F2E9D8", fontWeight: 700, fontSize: "0.9rem", margin: "0 0 0.4rem" }}>Revoca totale</p>
              <p style={{ color: "#6b7280", fontSize: "0.82rem", lineHeight: 1.6, margin: "0 0 1rem" }}>
                Esclude il tuo avatar da ogni utilizzo futuro. Azione prospettica e definitiva.
              </p>
              <button disabled={busy} onClick={() => { if (confirm("Revocare tutto il consenso? Il tuo avatar non sarà più utilizzabile.")) act({ type: "revoke_all" }); }}
                style={{ padding: "0.7rem 1.2rem", borderRadius: 10, background: "transparent", border: "1px solid #B8005C", color: "#B8005C", fontWeight: 700, fontSize: "0.85rem", cursor: busy ? "default" : "pointer" }}>
                Revoca tutto il consenso
              </button>
            </div>
          </>
        )}
      </section>
  );
}
