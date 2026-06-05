"use client";

import { useState } from "react";
import Link from "next/link";
import { TIER_CONFIG, Tier } from "@/lib/types";

interface Attrs {
  gender: string | null;
  ethnicity: string | null;
  hair_color: string | null;
  age_min: number | null;
  age_max: number | null;
  category: string | null;
}

interface MatchAvatar { handle: string; alias: string; portrait_url: string | null; tier: Tier; reasons: string[]; }

interface MatchResponse {
  matched: boolean;
  attrs: Attrs;
  reason?: string;
  results?: MatchAvatar[];
}

interface GenResult { certificate: string; royalty_cents: number; alias: string; image_url?: string; }

export default function MatchClient() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [generatingHandle, setGeneratingHandle] = useState<string | null>(null);
  const [genByHandle, setGenByHandle] = useState<Record<string, GenResult>>({});

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setGenByHandle({});
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    setResult(json);
  }

  async function generate(handle: string) {
    setGeneratingHandle(handle);
    setError(null);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, prompt }),
    });
    const json = await res.json();
    setGeneratingHandle(null);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    setGenByHandle((m) => ({ ...m, [handle]: json }));
  }

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" }}>
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 2rem", display: "flex", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)" }} />
          <span style={{ color: "#f0f0f5", fontSize: "0.8rem", letterSpacing: "0.15em", fontWeight: 700 }}>HUMAN2AI</span>
        </Link>
        <Link href="/account" style={{ color: "#6b7280", fontSize: "0.85rem", textDecoration: "none" }}>Account</Link>
      </nav>

      <section style={{ maxWidth: 600, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 0.5rem" }}>Trova un volto reale</h1>
        <p style={{ color: "#6b7280", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
          Descrivi l&apos;essere umano che ti serve. Cercheremo nel registro un avatar
          reale e consenziente. Se nessuno corrisponde, la richiesta viene bloccata —
          non si genera mai un umano senza una persona reale dietro.
        </p>

        <form onSubmit={search} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Es. una donna giapponese giovane per una campagna beauty"
            rows={3}
            style={{ width: "100%", padding: "0.9rem", borderRadius: 12, background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f5", fontSize: "0.95rem", outline: "none", resize: "vertical", fontFamily: "inherit" }}
          />
          <button type="submit" disabled={loading} style={{ padding: "0.85rem", borderRadius: 10, border: "none", background: loading ? "#374151" : "linear-gradient(135deg,#6B21E8,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: loading ? "default" : "pointer" }}>
            {loading ? "Analisi in corso…" : "Cerca avatar affine"}
          </button>
        </form>

        {error && <p style={{ color: "#B8005C", fontSize: "0.85rem", marginTop: "1.5rem" }}>{error}</p>}

        {result && (
          <div style={{ marginTop: "2rem" }}>
            {/* Attributi estratti */}
            <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "1.2rem", marginBottom: "1.2rem" }}>
              <p style={{ color: "#6b7280", fontSize: "0.72rem", letterSpacing: "0.06em", margin: "0 0 0.8rem" }}>ATTRIBUTI ESTRATTI DAL PROMPT</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <Attr label="Genere" v={result.attrs.gender} />
                <Attr label="Etnia" v={result.attrs.ethnicity} />
                <Attr label="Capelli" v={result.attrs.hair_color} />
                <Attr label="Età" v={result.attrs.age_min ? `${result.attrs.age_min}-${result.attrs.age_max}` : null} />
                <Attr label="Categoria" v={result.attrs.category} />
              </div>
            </div>

            {result.matched && result.results && result.results.length > 0 ? (
              <>
                <p style={{ color: "#00A896", fontWeight: 700, fontSize: "0.85rem", margin: "0 0 1rem" }}>
                  ✓ {result.results.length} AVATAR {result.results.length === 1 ? "TROVATO" : "TROVATI"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {result.results.map((avatar) => {
                    const gen = genByHandle[avatar.handle];
                    const generating = generatingHandle === avatar.handle;
                    return (
                      <div key={avatar.handle} style={{ background: "#12121a", border: "1px solid rgba(0,168,150,0.3)", borderRadius: 16, padding: "1.5rem" }}>
                        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                          <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", background: "#1c1c28", flexShrink: 0 }}>
                            {avatar.portrait_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={avatar.portrait_url} alt={avatar.alias} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{avatar.alias}</div>
                            <div style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: "0.3rem" }}>@{avatar.handle}</div>
                            <span style={{ background: TIER_CONFIG[avatar.tier].bg, color: TIER_CONFIG[avatar.tier].color, borderRadius: 999, padding: "0.15rem 0.6rem", fontSize: "0.7rem", fontWeight: 700 }}>
                              {TIER_CONFIG[avatar.tier].label}
                            </span>
                          </div>
                        </div>
                        <p style={{ color: "#374151", fontSize: "0.75rem", margin: "1rem 0 0" }}>
                          Affinità: {avatar.reasons.join(" · ")}
                        </p>
                        {!gen ? (
                          <>
                            <button onClick={() => generate(avatar.handle)} disabled={generating}
                              style={{ width: "100%", marginTop: "1.2rem", padding: "0.8rem", borderRadius: 10, border: "none", background: generating ? "#374151" : "linear-gradient(135deg,#6B21E8,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.88rem", cursor: generating ? "default" : "pointer" }}>
                              {generating ? "Generazione…" : "Genera con questo avatar"}
                            </button>
                            <Link href={`/passport/${avatar.handle}`} style={{ display: "block", textAlign: "center", marginTop: "0.6rem", padding: "0.75rem", borderRadius: 10, background: "rgba(107,33,232,0.12)", border: "1px solid rgba(107,33,232,0.3)", color: "#f0f0f5", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
                              Vedi il passport →
                            </Link>
                          </>
                        ) : (
                          <div style={{ marginTop: "1.2rem", background: "#0a0a0f", border: "1px solid rgba(0,168,150,0.25)", borderRadius: 12, padding: "1.2rem" }}>
                            <p style={{ color: "#00A896", fontWeight: 700, fontSize: "0.85rem", margin: "0 0 0.5rem" }}>✓ Generazione certificata</p>
                            {gen.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={gen.image_url} alt="output generato" style={{ width: "100%", maxWidth: 240, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", marginBottom: "0.8rem", background: "#1c1c28" }} />
                            )}
                            <p style={{ color: "#6b7280", fontSize: "0.82rem", lineHeight: 1.6, margin: "0 0 0.8rem" }}>
                              {gen.alias} ha ricevuto una royalty di{" "}
                              <strong style={{ color: "#f0f0f5" }}>{(gen.royalty_cents / 100).toFixed(2)} €</strong> (ad accumulo).
                            </p>
                            <p style={{ color: "#374151", fontSize: "0.68rem", letterSpacing: "0.04em", margin: "0 0 0.3rem" }}>CREDENZIALE D&apos;USCITA (hash anonimo)</p>
                            <code style={{ display: "block", color: "#6B21E8", fontSize: "0.7rem", wordBreak: "break-all", fontFamily: "monospace" }}>{gen.certificate}</code>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ background: "rgba(184,0,92,0.05)", border: "1px solid rgba(184,0,92,0.3)", borderRadius: 16, padding: "1.5rem" }}>
                <p style={{ color: "#B8005C", fontWeight: 700, fontSize: "0.95rem", margin: "0 0 0.5rem" }}>⛔ Richiesta bloccata</p>
                <p style={{ color: "#6b7280", fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{result.reason}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Attr({ label, v }: { label: string; v: string | null }) {
  return (
    <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "0.4rem 0.7rem" }}>
      <span style={{ color: "#374151", fontSize: "0.68rem" }}>{label}: </span>
      <span style={{ color: v ? "#f0f0f5" : "#374151", fontSize: "0.78rem", fontWeight: 600 }}>{v ?? "—"}</span>
    </div>
  );
}
