"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Fase 1.5 / finding 6.5: durante una generazione ECHO asincrona l'utente deve
// vedere uno stato CHIARO su /account (non una pagina morta). Il server passa i
// job 'pending'/'running' del buyer; qui li seguiamo live riusando l'endpoint
// /api/generate/job/[id] (stesso del flusso /match), senza nuove API.

export interface ActiveJob {
  id: string;
  status: string; // pending | running | done | error
  category?: string | null;
}

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "In coda", color: "#F2A93B" },
  running: { label: "In generazione…", color: "#F2A93B" },
  done: { label: "Pronta", color: "#7FAE96" },
  error: { label: "Non riuscita. I VOLT sono stati riaccreditati.", color: "#EE7A70" },
};

export function ActiveJobs({ initial }: { initial: ActiveJob[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<ActiveJob[]>(initial);
  // Chiave stabile dei dati dal server: quando cambia (es. dopo router.refresh)
  // l'effetto risincronizza lo stato e riavvia il polling.
  const initialKey = initial.map((j) => `${j.id}:${j.status}`).join(",");

  useEffect(() => {
    setJobs(initial);
    const activeIds = initial.filter((j) => j.status === "pending" || j.status === "running").map((j) => j.id);
    if (activeIds.length === 0) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const poll = (id: string) => {
      const run = async () => {
        if (cancelled) return;
        try {
          const r = await fetch(`/api/generate/job/${id}`);
          const j = await r.json();
          if (!cancelled && r.ok && j.status) {
            setJobs((prev) => prev.map((p) => (p.id === id ? { ...p, status: j.status } : p)));
            if (j.status === "done" || j.status === "error") return; // terminale: stop
          }
        } catch {
          /* rete: riprova al giro dopo */
        }
        if (!cancelled) timers.push(setTimeout(run, 4000));
      };
      timers.push(setTimeout(run, 1500));
    };
    activeIds.forEach(poll);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  if (jobs.length === 0) return null;

  return (
    <div style={{ background: "#141A24", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem", marginTop: "1.2rem" }}>
      <p style={{ color: "rgba(242,233,216,0.70)", fontSize: "0.8rem", letterSpacing: "0.06em", margin: "0 0 1rem" }}>GENERAZIONI IN CORSO</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        {jobs.map((j) => {
          const s = STATUS[j.status] ?? STATUS.pending;
          return (
            <div key={j.id} style={{ display: "flex", alignItems: "center", gap: "0.7rem", background: "#0C0F17", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "0.8rem 0.9rem" }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0, boxShadow: `0 0 8px ${s.color}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#F2E9D8", fontSize: "0.85rem", fontWeight: 600 }}>
                  Generazione ECHO{j.category ? ` · ${j.category}` : ""}
                </div>
                <div style={{ color: s.color, fontSize: "0.78rem", marginTop: "0.1rem" }}>{s.label}</div>
              </div>
              {j.status === "done" && (
                <button
                  onClick={() => router.refresh()}
                  style={{ flexShrink: 0, padding: "0.5rem 1rem", borderRadius: 999, background: "rgba(127,174,150,0.15)", border: "1px solid rgba(127,174,150,0.4)", color: "#9CC6B2", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
                >
                  Vedi
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ color: "rgba(242,233,216,0.45)", fontSize: "0.7rem", margin: "1rem 0 0", lineHeight: 1.5 }}>
        Puoi lasciare questa pagina: la generazione prosegue sul server e i VOLT sono già impegnati.
      </p>
    </div>
  );
}
