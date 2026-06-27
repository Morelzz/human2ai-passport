"use client";

import { useState } from "react";
import { KycStep, KycPending, WardConsentStep, WardActive } from "../steps";
import { FaceCapture } from "../face-capture";

// Stato iniziale dal KYC del profilo: approvato -> salta al Passo 2; in verifica
// (Didit asincrono, rientro dal redirect) -> attesa; altrimenti -> Passo 1.
function initialStep(kycStatus: string): "kyc" | "pending" | "photo" {
  if (kycStatus === "approved") return "photo";
  if (kycStatus === "pending") return "pending";
  return "kyc";
}

// Flusso "Identita protetta" (spec E/F3): KYC (Passo 1) -> foto del volto
// (Passo 3b, crea l'avatar protection_only + faceprint) -> consenso Ward
// (monitoring_consents) -> Ward attivo. Riusa FaceCapture e gli step condivisi.
export function ProtectedFlow({ kycStatus, diditEnabled }: { kycStatus: string; diditEnabled: boolean }) {
  const [step, setStep] = useState<"kyc" | "pending" | "photo" | "consent" | "done">(initialStep(kycStatus));

  return (
    <div className="wf">
      {step === "kyc" && <KycStep diditEnabled={diditEnabled} returnTo="/signup/avatar/protected?didit=done" onVerified={() => setStep("photo")} />}
      {step === "pending" && <KycPending />}

      {step === "photo" && (
        <div className="wf-card">
          <span className="wf-eyebrow">Passo 2, il tuo riferimento</span>
          <h2 className="wf-title">Aggiungi le foto del volto</h2>
          <p className="wf-lede">Diventano il tuo riferimento protetto, il volto che la protezione riconosce. Solo il viso, non servono pose del corpo.</p>
          <FaceCapture onDone={() => setStep("consent")} />
        </div>
      )}

      {step === "consent" && <WardConsentStep onActivated={() => setStep("done")} />}
      {step === "done" && <WardActive />}
    </div>
  );
}
