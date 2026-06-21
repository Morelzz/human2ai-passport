"use client";

import { useState } from "react";
import { KycStep, WardConsentStep, WardActive } from "../steps";
import { FaceCapture } from "../face-capture";

// Flusso "Identita protetta" (spec E/F3): KYC (Passo 1) -> foto del volto
// (Passo 3b, crea l'avatar protection_only + faceprint) -> consenso Ward
// (monitoring_consents) -> Ward attivo. Riusa FaceCapture e gli step condivisi.
export function ProtectedFlow({ kycDone }: { kycDone: boolean }) {
  const [step, setStep] = useState<"kyc" | "photo" | "consent" | "done">(kycDone ? "photo" : "kyc");

  return (
    <div className="wf">
      {step === "kyc" && <KycStep onVerified={() => setStep("photo")} />}

      {step === "photo" && (
        <div className="wf-card">
          <span className="wf-eyebrow">Passo 2, il tuo riferimento</span>
          <h2 className="wf-title">Aggiungi le foto del volto</h2>
          <p className="wf-lede">Diventano il tuo riferimento protetto, il volto che Ward riconosce. Solo il viso, non servono pose del corpo.</p>
          <FaceCapture onDone={() => setStep("consent")} />
        </div>
      )}

      {step === "consent" && <WardConsentStep onActivated={() => setStep("done")} />}
      {step === "done" && <WardActive />}
    </div>
  );
}
