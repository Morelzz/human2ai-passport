"use client";

import { useState } from "react";
import Link from "next/link";
import { TIER_CONFIG, Tier, CATEGORIES } from "@/lib/types";
import { formatEur, grossForCategory } from "@/lib/wallet";
import { SOUL_MODELS, SOUL_STYLES, DEFAULT_MODEL, SoulModel } from "@/lib/soul-models";

// --- Opzioni dell'identikit (chip cliccabili) ---
const GENDERS = [
  { v: "uomo", l: "Uomo" },
  { v: "donna", l: "Donna" },
];
const AGE_BANDS = [
  { l: "18-25", min: 18, max: 25 },
  { l: "26-35", min: 26, max: 35 },
  { l: "36-45", min: 36, max: 45 },
  { l: "46-60", min: 46, max: 60 },
  { l: "60+", min: 60, max: 99 },
];
const HAIRS = ["Neri", "Castani", "Biondi", "Rossi", "Grigi", "Rasati"];
const ETHNICITIES = ["Italiana", "Giapponese", "Cinese", "Indiana", "Nigeriana", "Afroamericana", "Caucasica", "Latina", "Araba"];

interface Attrs {
  gender: string | null;
  ethnicity: string | null;
  hair_color: string | null;
  age_min: number | null;
  age_max: number | null;
}

interface MatchAvatar { handle: string; alias: string; portrait_url: string | null; tier: Tier; reasons: string[]; gallery_count: number; }

interface MatchResponse {
  matched: boolean;
  attrs: Attrs;
  category: string | null;
  reason?: string;
  results?: MatchAvatar[];
}

interface GenResult {
  mode: "preview" | "commercial";
  alias: string;
  image_url?: string;   // commerciale: URL pulito
  image_data?: string;  // anteprima: data-URL watermarkato
  certificate?: string;
  category?: string | null;
  gross_cents?: number;
  fee_cents?: number;
  royalty_cents?: number; // netto avatar
}

export default function MatchClient() {
  // Passo 1 — CHI: identikit (chip) + categoria d'uso
  const [gender, setGender] = useState("");
  const [ageIdx, setAgeIdx] = useState<number | null>(null);
  const [hair, setHair] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [category, setCategory] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);

  // Passo 2 — SCENA: direzione artistica libera, per ogni avatar trovato
  const [sceneByHandle, setSceneByHandle] = useState<Record<string, string>>({});
  const [generatingHandle, setGeneratingHandle] = useState<string | null>(null);
  const [genByHandle, setGenByHandle] = useState<Record<string, GenResult>>({});

  // Impostazioni di generazione: modello (qualità) + stile (solo Soul ID)
  const [model, setModel] = useState<SoulModel>(DEFAULT_MODEL);
  const [styleId, setStyleId] = useState("");
  const modelSupportsStyles = SOUL_MODELS.find((m) => m.id === model)?.supportsStyles ?? false;

  // toggle: ri-cliccando una chip già attiva la deselezioni
  const toggle = (cur: string, v: string, set: (s: string) => void) => set(cur === v ? "" : v);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const band = ageIdx != null ? AGE_BANDS[ageIdx] : null;
    if (!gender && !ethnicity && !hair && !band && !category) {
      setError("Seleziona almeno una caratteristica o una categoria d'uso.");
      return;
    }
    const identity = {
      gender: gender || null,
      ethnicity: ethnicity || null,
      hair_color: hair || null,
      age_min: band ? band.min : null,
      age_max: band ? band.max : null,
    };
    setLoading(true);
    setError(null);
    setResult(null);
    setGenByHandle({});
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity, category: category || null }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    setResult(json);
  }

  async function generate(handle: string, mode: "preview" | "commercial") {
    setGeneratingHandle(handle);
    setError(null);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle,
        mode,
        category: category || null,
        scene: sceneByHandle[handle] ?? "",
        model,
        styleId: modelSupportsStyles ? (styleId || null) : null,
      }),
    });
    const json = await res.json();
    setGeneratingHandle(null);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    setGenByHandle((m) => ({ ...m, [handle]: json }));
  }

  const priceLabel = formatEur(grossForCategory(category || null));

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" }}>
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 2rem", display: "flex", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#6B21E8,#B8005C)" }} />
          <span style={{ color: "#f0f0f5", fontSize: "0.8rem", letterSpacing: "0.15em", fontWeight: 700 }}>HUMAN2AI</span>
        </Link>
        <Link href="/account" style={{ color: "#6b7280", fontSize: "0.85rem", textDecoration: "none" }}>Account</Link>
      </nav>

      <section style={{ maxWidth: 620, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <span style={{ color: "#6B21E8", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em" }}>PASSO 1 — CHI</span>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.3rem 0 0.5rem" }}>Componi l&apos;identikit</h1>
        <p style={{ color: "#6b7280", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
          Seleziona le caratteristiche della <strong style={{ color: "#9ca3af" }}>persona</strong> e la categoria d&apos;uso.
          Cercheremo nel registro un avatar reale e consenziente. La <em>scena</em> la dirigi dopo.
        </p>

        <form onSubmit={search} style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
          <ChipGroup label="Genere">
            {GENDERS.map((g) => (
              <Chip key={g.v} active={gender === g.v} onClick={() => toggle(gender, g.v, setGender)}>{g.l}</Chip>
            ))}
          </ChipGroup>

          <ChipGroup label="Età">
            {AGE_BANDS.map((b, i) => (
              <Chip key={b.l} active={ageIdx === i} onClick={() => setAgeIdx(ageIdx === i ? null : i)}>{b.l}</Chip>
            ))}
          </ChipGroup>

          <ChipGroup label="Capelli">
            {HAIRS.map((h) => (
              <Chip key={h} active={hair === h.toLowerCase()} onClick={() => toggle(hair, h.toLowerCase(), setHair)}>{h}</Chip>
            ))}
          </ChipGroup>

          <ChipGroup label="Etnia">
            {ETHNICITIES.map((e) => (
              <Chip key={e} active={ethnicity === e.toLowerCase()} onClick={() => toggle(ethnicity, e.toLowerCase(), setEthnicity)}>{e}</Chip>
            ))}
          </ChipGroup>

          <ChipGroup label="Categoria d'uso" hint="determina prezzo e consenso">
            {CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => toggle(category, c, setCategory)}>{c}</Chip>
            ))}
          </ChipGroup>

          <button type="submit" disabled={loading} style={{ padding: "0.9rem", borderRadius: 10, border: "none", background: loading ? "#374151" : "linear-gradient(135deg,#6B21E8,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: loading ? "default" : "pointer", marginTop: "0.4rem" }}>
            {loading ? "Ricerca in corso…" : "Cerca avatar affine"}
          </button>
        </form>

        {error && <p style={{ color: "#B8005C", fontSize: "0.85rem", marginTop: "1.5rem" }}>{error}</p>}

        {result && (
          <div style={{ marginTop: "2rem" }}>
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

                        {/* Galleria/repertorio: cosa produce questo Soul (campioni watermarkati) */}
                        {avatar.gallery_count > 0 && (
                          <div style={{ marginTop: "1.2rem" }}>
                            <span style={{ color: "#9ca3af", fontSize: "0.72rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                              Repertorio <span style={{ color: "#374151", fontWeight: 400 }}>· esempi generati da questo volto</span>
                            </span>
                            <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.3rem" }}>
                              {Array.from({ length: avatar.gallery_count }).map((_, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={`/api/sample/${avatar.handle}/${i}`} alt={`esempio ${i + 1}`}
                                  style={{ height: 150, width: 112, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "#1c1c28", flexShrink: 0 }} />
                              ))}
                            </div>
                          </div>
                        )}

                        {!gen ? (
                          <>
                            {/* Passo 2 — SCENA: direzione artistica libera */}
                            <div style={{ marginTop: "1.2rem" }}>
                              <label style={{ color: "#6B21E8", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", display: "block", marginBottom: "0.5rem" }}>
                                PASSO 2 — SCENA / DIREZIONE
                              </label>
                              <textarea
                                value={sceneByHandle[avatar.handle] ?? ""}
                                onChange={(e) => setSceneByHandle((m) => ({ ...m, [avatar.handle]: e.target.value }))}
                                placeholder="Es. che balla in spiaggia al tramonto, luce dorata, look estivo, 35mm"
                                rows={2}
                                style={{ width: "100%", padding: "0.8rem", borderRadius: 10, background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f5", fontSize: "0.9rem", outline: "none", resize: "vertical", fontFamily: "inherit" }}
                              />
                              <p style={{ color: "#374151", fontSize: "0.68rem", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
                                Scena libera: azione, ambientazione, luce, stile. Il volto resta {avatar.alias} — garantito dal Soul.
                              </p>
                            </div>

                            {/* Modello (qualità) */}
                            <div style={{ marginTop: "1rem" }}>
                              <span style={{ color: "#9ca3af", fontSize: "0.72rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>Modello</span>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                {SOUL_MODELS.map((m) => (
                                  <Chip key={m.id} active={model === m.id} onClick={() => setModel(m.id)}>
                                    {m.label} · {m.quality}
                                  </Chip>
                                ))}
                              </div>
                            </div>

                            {/* Stile (solo Soul ID) */}
                            {modelSupportsStyles && (
                              <div style={{ marginTop: "0.9rem" }}>
                                <span style={{ color: "#9ca3af", fontSize: "0.72rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                                  Stile <span style={{ color: "#374151", fontWeight: 400 }}>· opzionale</span>
                                </span>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                                  {SOUL_STYLES.map((s) => (
                                    <Chip key={s.id} active={styleId === s.id} onClick={() => setStyleId(styleId === s.id ? "" : s.id)}>
                                      {s.label}
                                    </Chip>
                                  ))}
                                </div>
                              </div>
                            )}

                            <button onClick={() => generate(avatar.handle, "commercial")} disabled={generating}
                              style={{ width: "100%", marginTop: "1rem", padding: "0.8rem", borderRadius: 10, border: "none", background: generating ? "#374151" : "linear-gradient(135deg,#6B21E8,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.88rem", cursor: generating ? "default" : "pointer" }}>
                              {generating ? "Generazione…" : `Genera la tua scena · ${priceLabel}`}
                            </button>
                            <p style={{ color: "#374151", fontSize: "0.68rem", margin: "0.6rem 0 0", lineHeight: 1.5 }}>
                              Output pulito, full-res, con certificato e royalty a {avatar.alias}.
                            </p>
                            <Link href={`/passport/${avatar.handle}`} style={{ display: "block", textAlign: "center", marginTop: "0.6rem", padding: "0.75rem", borderRadius: 10, background: "rgba(107,33,232,0.12)", border: "1px solid rgba(107,33,232,0.3)", color: "#f0f0f5", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}>
                              Vedi il passport →
                            </Link>
                          </>
                        ) : (
                          <div style={{ marginTop: "1.2rem", background: "#0a0a0f", border: "1px solid rgba(0,168,150,0.25)", borderRadius: 12, padding: "1.2rem" }}>
                            <p style={{ color: "#00A896", fontWeight: 700, fontSize: "0.85rem", margin: "0 0 0.8rem" }}>✓ Generazione certificata</p>
                            {gen.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={gen.image_url} alt="output generato" style={{ width: "100%", maxWidth: 280, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", marginBottom: "1rem", background: "#1c1c28" }} />
                            )}

                            {/* Breakdown economico */}
                            <div style={{ background: "#12121a", borderRadius: 10, padding: "0.9rem 1rem", marginBottom: "0.9rem" }}>
                              <EuroRow label={`Costo generazione${gen.category ? ` (${gen.category})` : ""}`} value={formatEur(gen.gross_cents ?? 0)} dim />
                              <EuroRow label="Fee piattaforma" value={`− ${formatEur(gen.fee_cents ?? 0)}`} dim />
                              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0.6rem 0" }} />
                              <EuroRow label={`Royalty a ${gen.alias}`} value={formatEur(gen.royalty_cents ?? 0)} highlight />
                            </div>

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

function ChipGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.6rem" }}>
        <span style={{ color: "#9ca3af", fontSize: "0.78rem", fontWeight: 600 }}>{label}</span>
        {hint && <span style={{ color: "#374151", fontSize: "0.68rem" }}>· {hint}</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "0.5rem 0.9rem",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: "0.82rem",
        fontWeight: 600,
        background: active ? "rgba(107,33,232,0.18)" : "#12121a",
        border: active ? "1px solid #6B21E8" : "1px solid rgba(255,255,255,0.1)",
        color: active ? "#f0f0f5" : "#9ca3af",
        transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  );
}

function EuroRow({ label, value, dim, highlight }: { label: string; value: string; dim?: boolean; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0.15rem 0" }}>
      <span style={{ color: dim ? "#6b7280" : "#9ca3af", fontSize: "0.82rem" }}>{label}</span>
      <span style={{ color: highlight ? "#00A896" : "#9ca3af", fontSize: highlight ? "1.05rem" : "0.85rem", fontWeight: highlight ? 800 : 600 }}>{value}</span>
    </div>
  );
}
