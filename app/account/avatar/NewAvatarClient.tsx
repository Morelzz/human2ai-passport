"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES, IDENTITY_KIT, IDENTITY_LABELS, TIER_CONFIG, Tier } from "@/lib/types";
import { POSES, PoseGlyph } from "@/components/avatar/poses";

const TIERS: Tier[] = ["SPARK", "SHAPE", "SOUL", "HUMAN"];

export default function NewAvatarClient({ defaultAlias, isEnterprise = false }: { defaultAlias: string; isEnterprise?: boolean }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [alias, setAlias] = useState(defaultAlias);
  // Profilo pubblico facoltativo (passport): nome reale + social
  const [realName, setRealName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tier, setTier] = useState<Tier>("SOUL");
  const [approved, setApproved] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [kit, setKit] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [consentUrl, setConsentUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refs, setRefs] = useState<(string | null)[]>(() => Array(POSES.length).fill(null));
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeNote, setAnalyzeNote] = useState<string | null>(null);

  const kitComplete = (Object.keys(IDENTITY_KIT) as (keyof typeof IDENTITY_KIT)[]).every((f) => kit[f]);

  async function pickPhoto(slot: number, file?: File) {
    if (!file) return;
    try {
      const d = await resizeFile(file);
      setRefs((a) => { const n = [...a]; n[slot] = d; return n; });
    } catch {
      setError("Immagine non leggibile, riprova.");
    }
  }

  // Claude SUGGERISCE i campi visivi dell'identikit dalle foto; la persona conferma.
  async function analyze() {
    const imgs = refs.filter((d): d is string => !!d);
    if (imgs.length === 0) { setAnalyzeNote("Carica almeno una foto per l'analisi."); return; }
    setAnalyzing(true); setAnalyzeNote(null);
    try {
      const res = await fetch("/api/avatar/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imgs }),
      });
      const json = await res.json();
      if (!res.ok) { setAnalyzeNote(json.error ?? "Analisi non riuscita."); }
      else {
        const s = (json.suggestions ?? {}) as Record<string, string>;
        setKit((k) => ({ ...k, ...s }));
        const n = Object.keys(s).length;
        setAnalyzeNote(n > 0
          ? `Pre-compilati ${n} campi da Claude — controllali e conferma. L'etnia dichiarala tu (dato sensibile).`
          : "Nessun campo proposto con sicurezza: compila l'identikit a mano.");
      }
    } catch {
      setAnalyzeNote("Analisi non riuscita.");
    }
    setAnalyzing(false);
  }

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
    // SOUL/HUMAN (identity-lock, motore ECHO) richiedono almeno una foto: senza,
    // l'avatar nascerebbe non generabile.
    if ((tier === "SOUL" || tier === "HUMAN") && refs.every((d) => !d)) {
      setError(`Per il livello ${tier} carica almeno una foto: bloccano l'identità reale per le generazioni fedeli.`);
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch("/api/avatar/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle, alias, tier, approved_categories: approved, excluded_categories: excluded, ...kit,
        real_name: realName, instagram, facebook,
        references: refs.map((d, slot) => (d ? { slot, data: d } : null)).filter(Boolean),
      }),
    });
    let json: { error?: string; consent_url?: string; handle?: string } = {};
    try { json = await res.json(); } catch { /* es. 413: risposta senza JSON */ }
    if (!res.ok) {
      setError(res.status === 413
        ? "Le foto sono troppo grandi o troppe per l'invio: riprova con meno foto o immagini più leggere."
        : (json.error ?? "Errore nella creazione, riprova."));
      setLoading(false);
      return;
    }
    // Enterprise: l'avatar è in attesa del consenso della persona -> mostra il link.
    if (json.consent_url) {
      setConsentUrl(json.consent_url);
      setLoading(false);
      return;
    }
    router.push(`/passport/${json.handle}`);
    router.refresh();
  }

  return (
      <section style={{ maxWidth: 560, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {consentUrl ? (
          <div style={{ background: "#12121a", border: "1px solid rgba(0,168,150,0.3)", borderRadius: 18, padding: "2rem" }}>
            <p style={{ color: "#00A896", fontWeight: 800, fontSize: "1.1rem", margin: "0 0 0.5rem" }}>✓ Avatar creato — in attesa del consenso</p>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 1.2rem" }}>
              Condividi questo link con la persona. Solo lei, aprendolo, conferma il consenso.
              Dopo la conferma, l&apos;avatar passa alla revisione dei nostri operatori.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <code style={{ flex: 1, minWidth: 200, background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "0.6rem 0.8rem", color: "#8b47f0", fontSize: "0.78rem", wordBreak: "break-all" }}>{consentUrl}</code>
              <button type="button" onClick={() => { navigator.clipboard.writeText(consentUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                style={{ padding: "0.6rem 1rem", borderRadius: 8, border: "1px solid rgba(107,33,232,0.3)", background: "rgba(107,33,232,0.12)", color: copied ? "#00A896" : "#8b47f0", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                {copied ? "✓ Copiato" : "Copia"}
              </button>
            </div>
            <Link href="/account" style={{ display: "inline-block", marginTop: "1.5rem", color: "#6b7280", fontSize: "0.85rem", textDecoration: "none" }}>← Torna all&apos;account</Link>
          </div>
        ) : (
        <>
        <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
          {isEnterprise ? "Onboarda un avatar" : "Crea il tuo avatar"}
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
          {isEnterprise
            ? "Inserisci i dati della persona. Dopo la creazione riceverai un link da farle aprire per il consenso; poi l'avatar passa alla revisione dei nostri operatori prima di andare live."
            : "Entrerai nel registro pubblico con un token verificabile. La revoca sarà sempre possibile e prospettica (blocca gli usi futuri, non il passato)."}
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

          {/* Profilo pubblico opzionale: nome reale e social sul passport */}
          <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "1.2rem" }}>
            <p style={{ color: "#f0f0f5", fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.3rem" }}>Profilo pubblico · facoltativo</p>
            <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0 0 1rem", lineHeight: 1.5 }}>
              Se vuoi, sul passport possono comparire il tuo <strong>nome e cognome</strong> e i tuoi <strong>canali social</strong>. Tutto facoltativo: decidi tu quanto essere riconoscibile.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <div>
                <label style={lbl}>Nome e cognome (pubblico sul passport)</label>
                <input value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="es. Manuel Caso" style={inp} />
              </div>
              <div>
                <label style={lbl}>Instagram</label>
                <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@tuo-profilo o URL" style={inp} />
              </div>
              <div>
                <label style={lbl}>Facebook</label>
                <input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="tuo-profilo o URL" style={inp} />
              </div>
            </div>
          </div>

          {/* Le tue foto — reference-set per l'identity-lock (ECHO) */}
          <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "1.2rem" }}>
            <p style={{ color: "#f0f0f5", fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.3rem" }}>Le tue foto · 8 pose</p>
            <p style={{ color: "#374151", fontSize: "0.72rem", margin: "0 0 1rem", lineHeight: 1.5 }}>
              Bloccano l&apos;identità reale per le generazioni fotorealistiche (motore ECHO). Foto <strong>nitide, ben illuminate, sfondo neutro, senza filtri</strong>, almeno 1024px. Restano <strong>private e cifrate</strong>.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem" }}>
              {POSES.map((p, slot) => (
                <label key={p.key} title={p.tip}
                  style={{ cursor: "pointer", border: `1px dashed ${refs[slot] ? "#6B21E8" : "rgba(255,255,255,0.14)"}`, borderRadius: 10, padding: "0.4rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.3rem", background: refs[slot] ? "rgba(107,33,232,0.08)" : "transparent", aspectRatio: "3 / 4", overflow: "hidden", position: "relative" }}>
                  {refs[slot] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={refs[slot]!} alt={p.label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <>
                      <PoseGlyph pose={p} />
                      <span style={{ color: "#6b7280", fontSize: "0.58rem", fontWeight: 600, textAlign: "center", lineHeight: 1.15 }}>{p.label}</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => { pickPhoto(slot, e.target.files?.[0]); e.currentTarget.value = ""; }} style={{ display: "none" }} />
                </label>
              ))}
            </div>
            <button type="button" onClick={analyze} disabled={analyzing || refs.every((d) => !d)}
              style={{ marginTop: "1rem", width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid rgba(107,33,232,0.3)", background: "rgba(107,33,232,0.12)", color: "#8b47f0", fontWeight: 700, fontSize: "0.8rem", cursor: analyzing || refs.every((d) => !d) ? "default" : "pointer", opacity: refs.every((d) => !d) ? 0.5 : 1 }}>
              {analyzing ? "Analisi in corso…" : "✨ Analizza le foto e compila l'identikit"}
            </button>
            {analyzeNote && <p style={{ color: "#9aa0aa", fontSize: "0.72rem", margin: "0.6rem 0 0", lineHeight: 1.5 }}>{analyzeNote}</p>}
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
            {loading ? "Creazione…" : isEnterprise ? "Crea avatar e genera link di consenso" : "Crea avatar e firma il consenso"}
          </button>
        </form>
        </>
        )}
      </section>
  );
}

// Le 8 pose canoniche e la loro icona vivono in components/avatar/poses
// (condivise con il KYC, che usa la stessa griglia).

// Ridimensiona un File a ≤1024px e ritorna un data-URL JPEG (payload leggero).
function resizeFile(file: File, max = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src = url;
  });
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
