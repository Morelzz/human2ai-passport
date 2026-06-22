"use client";

import { useEffect, useState, useCallback } from "react";
import { classifyIdentityMatch } from "@/lib/identity-match";
import type { FaceMatchResult } from "@/lib/face-match";

interface PendingAvatar {
  id: string;
  handle: string;
  alias: string;
  gender: string | null;
  age_range: string | null;
  ethnicity: string | null;
  hair_color: string | null;
  created_at: string;
  org_id: string | null;
  person_consented_at: string | null;
  identity_match: FaceMatchResult | null;
  doc_url: string | null;
  selfie_url: string | null;
  photo_url: string | null;
}

// salvia=forte, amber=media, coral=bassa (come nel flusso di creazione).
function bandColor(band: "strong" | "review" | "weak"): string {
  return band === "strong" ? "var(--verified-c)" : band === "review" ? "#F2A93B" : "var(--blocked-c)";
}

const THUMBS: { key: "doc_url" | "selfie_url" | "photo_url"; label: string }[] = [
  { key: "doc_url", label: "Documento" },
  { key: "selfie_url", label: "Selfie" },
  { key: "photo_url", label: "Foto avatar" },
];

export default function ReviewClient() {
  const [items, setItems] = useState<PendingAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/review");
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

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id);
    const res = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_id: id, action }),
    });
    setBusy(null);
    if (res.ok) setItems((xs) => xs.filter((x) => x.id !== id));
    else { const j = await res.json().catch(() => ({})); setError(j.error ?? "Errore"); }
  }

  return (
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <span style={{ color: "var(--blocked-c)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em" }}>OPERATORI</span>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.3rem 0 0.5rem" }}>Coda di certificazione</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
          Avatar in attesa di certificazione. Approva solo se l&apos;identità è coerente: il documento, il
          selfie e le foto devono essere della <strong>stessa persona</strong>. Il match volto qui sotto è
          un aiuto alla decisione, mai una prova: guarda sempre le immagini. Solo gli approvati vanno live.
        </p>

        {error && <p style={{ color: "var(--blocked-c)", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Caricamento…</p>
        ) : items.length === 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)", borderRadius: 16, padding: "2rem", textAlign: "center" }}>
            <p style={{ color: "var(--verified-c)", fontWeight: 700, margin: "0 0 0.3rem" }}>✓ Nessun avatar in attesa</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>La coda è vuota.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {items.map((a) => {
              const isOrg = !!a.org_id;
              const needsConsent = isOrg && !a.person_consented_at;
              const v = a.identity_match ? classifyIdentityMatch(a.identity_match) : null;
              return (
              <div key={a.id} style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)", borderRadius: 14, padding: "1.3rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: "1.02rem" }}>{a.alias}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.4rem" }}>@{a.handle} · {isOrg ? "organizzazione" : "privato"}</div>
                    <div style={{ color: "var(--text-faint)", fontSize: "0.76rem", marginBottom: "0.4rem" }}>
                      {[a.gender, a.age_range, a.ethnicity, a.hair_color].filter(Boolean).join(" · ") || "—"}
                    </div>
                    {isOrg ? (
                      a.person_consented_at ? (
                        <span style={{ color: "var(--verified-c)", fontSize: "0.72rem", fontWeight: 700 }}>● consenso persona confermato</span>
                      ) : (
                        <span style={{ color: "var(--blocked-c)", fontSize: "0.72rem", fontWeight: 700 }}>● in attesa del consenso della persona</span>
                      )
                    ) : (
                      <span style={{ color: "var(--verified-c)", fontSize: "0.72rem", fontWeight: 700 }}>● creato e firmato dalla persona stessa</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignSelf: "flex-start" }}>
                    <button onClick={() => decide(a.id, "reject")} disabled={busy === a.id}
                      style={{ padding: "0.55rem 1rem", borderRadius: 9, border: "1px solid rgba(238,122,112,0.4)", background: "transparent", color: "var(--blocked-c)", fontWeight: 700, fontSize: "0.82rem", cursor: busy === a.id ? "default" : "pointer" }}>
                      Rifiuta
                    </button>
                    <button onClick={() => decide(a.id, "approve")} disabled={busy === a.id || needsConsent}
                      title={needsConsent ? "La persona non ha ancora confermato il consenso" : ""}
                      style={{ padding: "0.55rem 1rem", borderRadius: 9, border: "none", background: busy === a.id || needsConsent ? "var(--elevated)" : "var(--verified-c)", color: busy === a.id || needsConsent ? "var(--text-muted)" : "#16352A", fontWeight: 800, fontSize: "0.82rem", cursor: busy === a.id || needsConsent ? "not-allowed" : "pointer" }}>
                      {busy === a.id ? "…" : "Certifica e pubblica"}
                    </button>
                  </div>
                </div>

                {/* Miniature: documento, selfie, prima foto dell'avatar */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                  {THUMBS.map(({ key, label }) => {
                    const url = a[key];
                    return (
                      <div key={key} style={{ border: "1px solid var(--hairline)", borderRadius: 10, aspectRatio: "1", background: "var(--bg)", overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt={label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ color: "var(--text-faint)", fontSize: "0.68rem" }}>{label} assente</span>
                        )}
                        <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(12,15,23,0.6)", color: "var(--text-muted)", fontSize: "0.62rem", textAlign: "center", padding: "2px 0" }}>{label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Badge match volto (aiuto alla decisione) */}
                <div style={{ background: "var(--bg)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "0.7rem 0.9rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Match volto (aiuto alla decisione)</span>
                  {v ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span style={{ color: "var(--text-faint)", fontSize: "0.72rem" }}>
                        {v.docSelfie ? `doc↔selfie ${v.docSelfie.similarity}%` : "doc↔selfie n/d"} · {v.selfiePhoto ? `selfie↔foto ${v.selfiePhoto.similarity}%` : "selfie↔foto n/d"}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: "0.82rem", padding: "0.2rem 0.7rem", borderRadius: 999, color: v.score === null ? "var(--text-muted)" : bandColor(v.verdict as "strong" | "review" | "weak"), background: "var(--surface)", border: "1px solid var(--hairline)" }}>
                        {v.score === null ? "inconcludente" : `${v.score}%`}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: "var(--text-faint)", fontSize: "0.72rem" }}>nessun match registrato</span>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>
  );
}
