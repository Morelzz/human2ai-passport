"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES, IDENTITY_KIT, IDENTITY_LABELS, TIER_CONFIG, Tier } from "@/lib/types";

const TIERS: Tier[] = ["SPARK", "SHAPE", "SOUL", "HUMAN"];

export default function NewAvatarClient({ defaultAlias }: { defaultAlias: string }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [alias, setAlias] = useState(defaultAlias);
  const [tier, setTier] = useState<Tier>("SOUL");
  const [approved, setApproved] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [kit, setKit] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const kitComplete = (Object.keys(IDENTITY_KIT) as (keyof typeof IDENTITY_KIT)[]).every((f) => kit[f]);

  function toggle(list: string[], setList: (v: string[]) => void, cat: string, otherList: string[], setOther: (v: string[]) => void) {
    if (list.includes(cat)) {
      setList(list.filter((c) => c !== cat));
    } else {
      setList([...list, cat]);
      if (otherList.includes(cat)) setOther(otherList.filter((c) => c !== cat));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!kitComplete) { setError("Completa tutti i campi dell'identity kit"); return; }
    setError(null);
    setLoading(true);
    const res = await fetch("/api/avatar/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, alias, tier, approved_categories: approved, excluded_categories: excluded, ...kit }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Errore");
      setLoading(false);
      return;
    }
    router.push(`/passport/${json.handle}`);
    router.refresh();
  }

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", color: "#f0f0f5" }}>
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 2rem" }}>
        <Link href="/account" style={{ color: "#6b7280", fontSize: "0.85rem", textDecoration: "none" }}>← Torna all&apos;account</Link>
      </nav>

      <section style={{ maxWidth: 560, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "0 0 0.5rem" }}>Crea il tuo avatar</h1>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
          Entrerai nel registro pubblico con un token verificabile. La revoca sarà
          sempre possibile e prospettica (blocca gli usi futuri, non il passato).
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
          <div>
            <label style={lbl}>Nome pubblico</label>
            <input value={alias} onChange={(e) => setAlias(e.target.value)} required style={inp} />
          </div>

          <div>
            <label style={lbl}>Handle (l&apos;indirizzo del tuo passport)</label>
            <input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} placeholder="es. riccardo-t" required style={inp} />
            <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0.35rem 0 0" }}>
              human2ai…/passport/<strong>{handle || "tuo-handle"}</strong>
            </p>
          </div>

          {/* Identity kit — immutabile dopo la creazione */}
          <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "1.2rem" }}>
            <p style={{ color: "#f0f0f5", fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.3rem" }}>Identity kit</p>
            <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0 0 1.2rem", lineHeight: 1.5 }}>
              Le caratteristiche strutturali dell&apos;avatar. Si fissano ora e <strong>non saranno più modificabili</strong>: rappresentano la persona reale.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {(Object.keys(IDENTITY_KIT) as (keyof typeof IDENTITY_KIT)[]).map((field) => (
                <div key={field}>
                  <label style={{ ...lbl, marginBottom: "0.4rem" }}>{IDENTITY_LABELS[field]}</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {IDENTITY_KIT[field].map((opt) => {
                      const on = kit[field] === opt;
                      return (
                        <button key={opt} type="button" onClick={() => setKit({ ...kit, [field]: opt })}
                          style={{ padding: "0.3rem 0.7rem", borderRadius: 999, fontSize: "0.76rem", fontWeight: 600, cursor: "pointer", background: on ? "rgba(107,33,232,0.15)" : "#12121a", color: on ? "#fff" : "#6b7280", border: `1px solid ${on ? "#6B21E8" : "rgba(255,255,255,0.08)"}` }}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={lbl}>Livello</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {TIERS.map((t) => {
                const cfg = TIER_CONFIG[t];
                const on = tier === t;
                return (
                  <button key={t} type="button" onClick={() => setTier(t)} style={{ padding: "0.6rem", borderRadius: 10, cursor: "pointer", textAlign: "left", background: on ? cfg.bg : "#12121a", border: `1px solid ${on ? cfg.color : "rgba(255,255,255,0.08)"}` }}>
                    <div style={{ color: cfg.color, fontWeight: 700, fontSize: "0.8rem" }}>{cfg.label}</div>
                    <div style={{ color: "#6b7280", fontSize: "0.7rem" }}>{cfg.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={lbl}>Categorie consentite</label>
            <Chips list={CATEGORIES as readonly string[]} selected={approved} accent="#00A896" onToggle={(c) => toggle(approved, setApproved, c, excluded, setExcluded)} />
          </div>

          <div>
            <label style={lbl}>Categorie escluse</label>
            <Chips list={CATEGORIES as readonly string[]} selected={excluded} accent="#B8005C" onToggle={(c) => toggle(excluded, setExcluded, c, approved, setApproved)} />
          </div>

          {error && <p style={{ color: "#B8005C", fontSize: "0.85rem", margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ padding: "0.85rem", borderRadius: 10, border: "none", background: loading ? "#374151" : "linear-gradient(135deg,#6B21E8,#B8005C)", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: loading ? "default" : "pointer" }}>
            {loading ? "Creazione…" : "Crea avatar e firma il consenso"}
          </button>
        </form>
      </section>
    </div>
  );
}

function Chips({ list, selected, accent, onToggle }: { list: readonly string[]; selected: string[]; accent: string; onToggle: (c: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
      {list.map((c) => {
        const on = selected.includes(c);
        return (
          <button key={c} type="button" onClick={() => onToggle(c)} style={{ padding: "0.3rem 0.75rem", borderRadius: 999, fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, background: on ? accent + "22" : "#12121a", color: on ? accent : "#6b7280", border: `1px solid ${on ? accent : "rgba(255,255,255,0.08)"}` }}>
            {c}
          </button>
        );
      })}
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", color: "#6b7280", fontSize: "0.78rem", marginBottom: "0.5rem", letterSpacing: "0.04em" };
const inp: React.CSSProperties = { width: "100%", padding: "0.7rem 0.9rem", borderRadius: 10, background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", color: "#f0f0f5", fontSize: "0.9rem", outline: "none" };
