"use client";

import { useCallback, useEffect, useState } from "react";
import { descriptorForUrl } from "@/lib/face-match";

// Costruzione dell'indice volti del registro. L'operatore preme un bottone:
// il browser scarica le foto sorgente di ogni avatar pubblico (ritratto se
// fotografico + reference private via URL firmati), calcola i descrittori
// FaceNet sul dispositivo e manda al server SOLO i vettori (mai i pixel).
// L'indice alimenta il fallback di /verify: volto riconosciuto anche quando
// la filigrana invisibile è stata distrutta (JPEG/screenshot/siti terzi).

interface AvatarSources {
  handle: string;
  alias: string;
  revoked: boolean;
  sources: { name: string; url: string }[];
}

interface IndexStatus {
  built_at: string;
  total: number;
  per_handle: Record<string, number>;
}

interface Entry {
  handle: string;
  source: string;
  descriptor: number[];
}

export default function FaceIndexClient() {
  const [avatars, setAvatars] = useState<AvatarSources[]>([]);
  const [index, setIndex] = useState<IndexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/face-index");
      const json = await res.json();
      setLoading(false);
      if (!res.ok) { setError(json.error ?? "Errore"); return; }
      setAvatars(json.avatars ?? []);
      setIndex(json.index ?? null);
    } catch {
      setLoading(false);
      setError("Errore di rete");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function rebuild() {
    setBuilding(true);
    setError(null);
    setDoneMsg(null);
    try {
      const entries: Entry[] = [];
      let done = 0;
      for (const a of avatars) {
        done++;
        for (const s of a.sources) {
          setProgress(`${a.alias} (${done}/${avatars.length}) — ${s.name}…`);
          // Foto senza volto rilevabile (es. pose di spalle) si saltano da sole.
          const d = await descriptorForUrl(s.url);
          if (d) entries.push({ handle: a.handle, source: s.name, descriptor: d });
        }
      }
      setProgress("Salvo l'indice…");
      const res = await fetch("/api/admin/face-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? `Errore salvataggio (${res.status})`); }
      else {
        setDoneMsg(`Indice ricostruito: ${json.saved} volti indicizzati.`);
        await load();
      }
    } catch {
      setError("Errore durante la costruzione dell'indice");
    }
    setProgress(null);
    setBuilding(false);
  }

  const totalSources = avatars.reduce((n, a) => n + a.sources.length, 0);

  return (
    <section style={{ maxWidth: 860, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <span style={{ color: "#00A896", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em" }}>OPERATORI</span>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0.3rem 0 0.5rem" }}>Indice volti del registro</h1>
      <p style={{ color: "#6b7280", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 0 1rem" }}>
        L&apos;indice permette a <strong>/verify</strong> di riconoscere il volto di un avatar anche quando
        un&apos;immagine <strong>non ha la filigrana</strong> (contenuti generati fuori da Human2AI): la persona
        può così scoprire l&apos;abuso e fare ricorso. I descrittori si calcolano <strong>in questo browser</strong>;
        al server arrivano solo vettori numerici, mai foto.
      </p>
      <p style={{ color: "#374151", fontSize: "0.78rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
        Ricostruisci l&apos;indice dopo ogni nuovo avatar approvato o nuovo set di reference.
        Si indicizzano solo foto reali: i ritratti segnaposto del seed (forme, non volti) vengono saltati.
      </p>

      {error && <p style={{ color: "#B8005C", fontSize: "0.85rem" }}>{error}</p>}
      {doneMsg && <p style={{ color: "#00d4be", fontSize: "0.85rem", fontWeight: 700 }}>{doneMsg}</p>}
      {loading && <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Carico il registro…</p>}

      {!loading && (
        <>
          {/* Stato attuale */}
          <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.2rem 1.5rem", marginBottom: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
            <div>
              {index ? (
                <>
                  <p style={{ color: "#f0f0f5", fontWeight: 700, margin: 0 }}>
                    {index.total} volt{index.total === 1 ? "o" : "i"} indicizzat{index.total === 1 ? "o" : "i"} · {Object.keys(index.per_handle).length} avatar
                  </p>
                  <p style={{ color: "#6b7280", fontSize: "0.78rem", margin: "0.15rem 0 0" }}>
                    ultima costruzione: {new Date(index.built_at).toLocaleString("it-IT")}
                  </p>
                </>
              ) : (
                <p style={{ color: "#e0b34d", fontWeight: 700, margin: 0 }}>Indice mai costruito — il fallback di /verify è spento.</p>
              )}
            </div>
            <button onClick={rebuild} disabled={building || totalSources === 0}
              style={{ padding: "0.7rem 1.4rem", borderRadius: 999, border: "none", background: building || totalSources === 0 ? "#1c1c28" : "#8b47f0", color: building || totalSources === 0 ? "#4b5563" : "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: building || totalSources === 0 ? "default" : "pointer" }}>
              {building ? "Costruzione in corso…" : index ? "Ricostruisci indice" : "Costruisci indice"}
            </button>
          </div>

          {progress && <p style={{ color: "#9ca3af", fontSize: "0.82rem", margin: "0 0 1.2rem" }}>⏳ {progress}</p>}

          {/* Avatar e sorgenti */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {avatars.map((a) => (
              <div key={a.handle} style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "0.8rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
                <div>
                  <span style={{ color: "#f0f0f5", fontWeight: 700, fontSize: "0.9rem" }}>{a.alias}</span>
                  <span style={{ color: "#6b7280", fontSize: "0.8rem", marginLeft: "0.5rem" }}>@{a.handle}</span>
                  {a.revoked && <span style={{ color: "#ff6aa5", fontSize: "0.72rem", fontWeight: 700, marginLeft: "0.5rem" }}>REVOCATO</span>}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ color: a.sources.length ? "#9ca3af" : "#374151", fontSize: "0.78rem" }}>
                    {a.sources.length} foto sorgente
                  </span>
                  <span style={{ color: index?.per_handle?.[a.handle] ? "#00d4be" : "#374151", fontSize: "0.78rem", fontWeight: 700 }}>
                    {index?.per_handle?.[a.handle] ?? 0} nell&apos;indice
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p style={{ color: "#374151", fontSize: "0.7rem", lineHeight: 1.5, margin: "1.2rem 0 0" }}>
            Nota: gli avatar revocati restano nell&apos;indice di proposito — la tutela del volto vale
            soprattutto per chi ha revocato. Un avatar uscito dal registro non viene mai nominato da
            /verify anche se presente in un indice vecchio (ricontrollo live a ogni verifica).
          </p>
        </>
      )}
    </section>
  );
}
