"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KycStep, KycPending, WardConsentStep, WardActive } from "./steps";

// Stato iniziale: con ?existing=1 si va dritti al consenso; altrimenti dipende
// dal KYC (approvato -> bivio, in verifica -> attesa, niente -> Passo 1).
function initialStep(existing: boolean, kycStatus: string): "kyc" | "pending" | "fork" | "consent" {
  if (existing) return "consent";
  if (kycStatus === "approved") return "fork";
  if (kycStatus === "pending") return "pending";
  return "kyc";
}

// Entry avatar (spec B2): KYC (Passo 1) -> bivio Aperto|Protetto (Passo 2). Con
// ?existing=1 (l'utente ha gia un avatar Semblic) si salta a "consenso Ward":
// attivazione col solo consenso, niente foto da rifare (spec C2 pannello 2).
export function AvatarFlow({ existing, kycStatus, diditEnabled }: { existing: boolean; kycStatus: string; diditEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"kyc" | "pending" | "fork" | "consent" | "done">(
    initialStep(existing, kycStatus),
  );

  return (
    <div className="wf">
      {step === "kyc" && <KycStep diditEnabled={diditEnabled} returnTo="/signup/avatar?didit=done" onVerified={() => setStep("fork")} />}
      {step === "pending" && <KycPending />}

      {step === "fork" && (
        <div className="wf-card">
          <span className="wf-eyebrow">Il bivio</span>
          <h2 className="wf-title">Cosa vuoi che succeda al tuo volto?</h2>
          <div className="wf-fork">
            <button type="button" className="wf-fork-card open" onClick={() => router.push("/signup/avatar/open")}>
              <h3>Avatar aperto</h3>
              <p>Disponibile alla generazione su licenza, guadagni royalty a ogni utilizzo. Aggiungi le foto e scegli le categorie.</p>
            </button>
            <button type="button" className="wf-fork-card protect" onClick={() => router.push("/signup/avatar/protected")}>
              <h3>Identita protetta</h3>
              <p>Mai generata da nessuna AI, bloccata ovunque. Ward da&apos; la caccia alle copie sul web.</p>
            </button>
          </div>
        </div>
      )}

      {step === "consent" && <WardConsentStep onActivated={() => setStep("done")} />}
      {step === "done" && <WardActive />}
    </div>
  );
}
