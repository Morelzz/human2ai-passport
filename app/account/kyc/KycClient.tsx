"use client";

import { useEffect, useState, useCallback } from "react";

// Coda KYC manuale: per ogni candidato l'operatore vede documento, selfie e
// foto (URL firmati temporanei dal bucket privato) e decide. La regola è una:
// documento, selfie e foto devono essere la STESSA persona.

interface MatchPair { distance: number; similarity: number; checked?: number }
interface FaceMatch {
  doc_selfie: MatchPair | null;
  selfie_photo: MatchPair | null;
  faces_found?: { document: boolean; selfie: boolean; photo: boolean };
}

interface PendingKyc {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
  files: { name: string; url: string }[];
  face_match: FaceMatch | null;
}

// Lettura della distanza FaceNet: <=0.5 alta, <=0.6 media, oltre bassa.
function matchTone(pair: MatchPair): { label: string; color: string; bg: string } {
  if (pair.distance <= 0.5) return { label: "alta", color: "#00d4be", bg: "rgba(0,168,150,0.12)" };
  if (pair.distance <= 0.6) return { label: "media", color: "#e0b34d", bg: "rgba(224,179,77,0.1)" };
  return { label: "bassa", color: "#ff6aa5", bg: "rgba(184,0,92,0.1)" };
}

// La percentuale si DERIVA sempre dalla distanza (fonte unica, stessa curva
// di lib/face-match): cosi' i json salvati con tarature vecchie restano leggibili.
function simPercent(distance: number): number {
  return Math.round(100 / (1 + Math.exp((distance - 0.6) / 0.1)));
}

function MatchBadge({ title, pair }: { title: string; pair: MatchPair | null }) {
  if (!pair) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "0.3rem 0.8rem", color: "#6b7280", fontSize: "0.74rem", fontWeight: 600 }}>
        {title}: non calcolabile
      </span>
    );
  }
  const t = matchTone(pair);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", border: `1px solid ${t.color}44`, background: t.bg, borderRadius: 999, padding: "0.3rem 0.8rem", fontSize: "0.74rem", fontWeight: 700 }}>
      <span style={{ color: "#6b7280", fontWeight: 600 }}>{title}:</span>
      <span style={{ color: t.color }}>{simPercent(pair.distance)}% · {t.label}</span>
    </span>
  );
}

const FILE_LABEL: Record<string, string> = {
  document: "Documento", // formato vecchio (candidature pre fronte/retro)
  "document-front": "Documento (fronte)",
  "document-back": "Documento (retro)",
  selfie: "Selfie",
};

function labelFor(name: string): string {
  const base = name.replace(/\.\w+$/, "");
  if (FILE_LABEL[base]) return FILE_LABEL[base];
  const m = base.match(/^photo-(\d+)$/);
  return m ? `Foto ${m[1]}` : base;
}

export default function KycClient() {
  const [items, setItems] = useState<PendingKyc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/kyc");
      const json = await res.json();
      setLoading(false);
      if (!res.ok) { setError(json.error ?? "Errore"); return; }
      setItems(json.items ?? []);
    } catch {
      setLoading(false);
      setError("Errore di rete");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function decide(userId: string, action: "approve" | "reject") {
    setBusy(userId);
    const res = await fetch("/api/admin/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, action }),
    });
    setBusy(null);
    if (res.ok) { setItems((xs) => xs.filter((x) => x.id !== userId)); setError(null); }
    else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Errore");
      if (res.status === 409) load(); // coda stale: ricarica per riallineare
    }
  }

  return (
    <section style={{ maxWidth: 860, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <span style={{ color: "#00A896", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em" }}>OPERATORI</span>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.3rem 0 0.5rem" }}>Verifiche identità (KYC)</h1>
      <p style={{ color: "#6b7280", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
        Persone in attesa di verifica. Approva solo se <strong>documento, selfie e foto sono la stessa persona</strong> e
        il documento è leggibile. I link alle immagini scadono dopo 1 ora; se servono di nuovo usa &quot;Ricarica coda&quot;.
      </p>

      {!loading && !error && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", margin: "0 0 1.5rem" }}>
          <span style={{ color: "#f0f0f5", fontSize: "0.85rem", fontWeight: 700 }}>{items.length} in attesa</span>
          <button onClick={() => load()} style={{ padding: "0.4rem 0.9rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#12121a", color: "#9aa0aa", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}>↻ Ricarica coda</button>
        </div>
      )}

      {error && <p style={{ color: "#B8005C", fontSize: "0.85rem" }}>{error}</p>}
      {loading && <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Carico la coda…</p>}
      {!loading && items.length === 0 && !error && (
        <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#00A896", fontWeight: 700, margin: 0 }}>✓ Nessuna verifica in attesa</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
        {items.map((p) => (
          <div key={p.id} style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
              <div>
                <p style={{ color: "#f0f0f5", fontWeight: 700, fontSize: "1rem", margin: 0 }}>{p.full_name || "(senza nome)"}</p>
                <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0.15rem 0 0" }}>{p.email}</p>
              </div>
              <span style={{ color: "#374151", fontSize: "0.75rem" }}>
                candidatura del {new Date(p.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>

            {/* Pre-screening face-match calcolato sul dispositivo della persona:
                aiuto alla decisione, NON una prova. L'operatore guarda le immagini. */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
              {p.face_match ? (
                <>
                  <MatchBadge title="documento ↔ selfie" pair={p.face_match.doc_selfie} />
                  <MatchBadge title={p.face_match.selfie_photo?.checked ? `selfie ↔ foto (migliore di ${p.face_match.selfie_photo.checked})` : "selfie ↔ foto"} pair={p.face_match.selfie_photo} />
                  <span style={{ alignSelf: "center", color: "#374151", fontSize: "0.68rem" }}>pre-screening sul dispositivo, la decisione resta tua</span>
                </>
              ) : (
                <span style={{ color: "#374151", fontSize: "0.72rem" }}>Nessun pre-screening automatico per questa candidatura.</span>
              )}
            </div>

            {p.files.length === 0 ? (
              <p style={{ color: "#B8005C", fontSize: "0.82rem" }}>Nessun file trovato per questa candidatura.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.8rem", marginBottom: "1.2rem" }}>
                {p.files.map((f) => (
                  <a key={f.name} href={f.url} target="_blank" rel="noreferrer"
                    style={{ display: "block", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", background: "#12121a", textDecoration: "none" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={labelFor(f.name)} style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", display: "block", background: "#1c1c28" }} />
                    <span style={{ display: "block", padding: "0.4rem 0.6rem", color: "#6b7280", fontSize: "0.72rem", fontWeight: 600 }}>{labelFor(f.name)}</span>
                  </a>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button onClick={() => decide(p.id, "approve")} disabled={busy === p.id}
                style={{ flex: 1, padding: "0.7rem", borderRadius: 10, border: "1px solid rgba(0,168,150,0.4)", background: "rgba(0,168,150,0.12)", color: "#00d4be", fontWeight: 700, fontSize: "0.85rem", cursor: busy === p.id ? "default" : "pointer", opacity: busy === p.id ? 0.6 : 1 }}>
                ✓ Approva
              </button>
              <button onClick={() => decide(p.id, "reject")} disabled={busy === p.id}
                style={{ flex: 1, padding: "0.7rem", borderRadius: 10, border: "1px solid rgba(184,0,92,0.4)", background: "rgba(184,0,92,0.1)", color: "#ff6aa5", fontWeight: 700, fontSize: "0.85rem", cursor: busy === p.id ? "default" : "pointer", opacity: busy === p.id ? 0.6 : 1 }}>
                ✕ Rifiuta
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
