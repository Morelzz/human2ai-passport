"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

type Step = "intro" | "document" | "liveness" | "processing" | "done" | "error";

export default function VerifyClient({ userId, initialStatus }: { userId: string; initialStatus: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStatus === "approved" ? "done" : "intro");
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: "pending" | "approved" | "rejected") {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ kyc_status: status }).eq("id", userId);
    if (error) throw new Error(error.message);
  }

  async function run() {
    try {
      setError(null);
      // 1. Lettura documento (simulata)
      setStep("document");
      await wait(1400);
      // 2. Liveness / face match (simulata)
      setStep("liveness");
      await wait(1600);
      // 3. Invio al provider → pending
      setStep("processing");
      await setStatus("pending");
      await wait(1800);
      // 4. Esito (mock: sempre approvato)
      await setStatus("approved");
      setStep("done");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore sconosciuto");
      setStep("error");
    }
  }

  return (
      <section style={{ maxWidth: 460, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(0,168,150,0.1)", border: "1px solid rgba(0,168,150,0.25)", borderRadius: 999, padding: "0.3rem 0.9rem", marginBottom: "1.5rem" }}>
          <span style={{ color: "#00A896", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em" }}>VERIFICA IDENTITÀ — DEMO</span>
        </div>

        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 0.6rem" }}>Verifica la tua identità</h1>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
          Per diventare un creatore verificato confermiamo che sei una persona reale.
          Lettura documento + controllo di vivezza (liveness). Questo è un provider
          <strong> simulato</strong>: nessun dato reale viene raccolto.
        </p>

        <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.5rem" }}>
          <Stage label="Lettura documento" state={stageState(step, "document")} />
          <Stage label="Controllo liveness + face match" state={stageState(step, "liveness")} />
          <Stage label="Invio al provider" state={stageState(step, "processing")} last />

          {step === "done" && (
            <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
              <p style={{ color: "#00A896", fontWeight: 700, fontSize: "1rem", margin: "0 0 1rem" }}>
                ✓ Identità verificata
              </p>
              <Link href="/account" style={btnStyle}>Vai all&apos;account</Link>
            </div>
          )}

          {step === "error" && (
            <p style={{ color: "#B8005C", fontSize: "0.85rem", marginTop: "1rem" }}>{error}</p>
          )}

          {(step === "intro" || step === "error") && (
            <button onClick={run} style={{ ...btnStyle, width: "100%", marginTop: "1.5rem", border: "none", cursor: "pointer" }}>
              {step === "error" ? "Riprova" : "Avvia verifica"}
            </button>
          )}
        </div>
      </section>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type StageVisual = "todo" | "active" | "ok";
function stageState(step: Step, stage: Step): StageVisual {
  const order: Step[] = ["document", "liveness", "processing"];
  const cur = order.indexOf(step);
  const idx = order.indexOf(stage);
  if (step === "done") return "ok";
  if (cur === -1) return "todo";
  if (idx < cur) return "ok";
  if (idx === cur) return "active";
  return "todo";
}

function Stage({ label, state, last }: { label: string; state: StageVisual; last?: boolean }) {
  const color = state === "ok" ? "#00A896" : state === "active" ? "#6B21E8" : "#374151";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", paddingBottom: last ? 0 : "1rem" }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {state === "ok" && <span style={{ color, fontSize: "0.7rem" }}>✓</span>}
        {state === "active" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />}
      </div>
      <span style={{ color: state === "todo" ? "#6b7280" : "#f0f0f5", fontSize: "0.88rem" }}>{label}</span>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.7rem 1.4rem",
  borderRadius: 10,
  background: "linear-gradient(135deg,#6B21E8,#B8005C)",
  color: "#fff",
  fontWeight: 700,
  fontSize: "0.88rem",
  textDecoration: "none",
};
