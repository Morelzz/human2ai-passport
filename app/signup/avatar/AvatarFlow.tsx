"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KycStep, WardConsentStep, WardActive } from "./steps";

// Entry avatar (spec B2): KYC (Passo 1) -> bivio Aperto|Protetto (Passo 2). Con
// ?existing=1 (l'utente ha gia un avatar Semblic) si salta a "consenso Ward":
// attivazione col solo consenso, niente foto da rifare (spec C2 pannello 2).
export function AvatarFlow({ existing, kycDone }: { existing: boolean; kycDone: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"kyc" | "fork" | "consent" | "done">(
    existing ? "consent" : kycDone ? "fork" : "kyc",
  );

  return (
    <div className="wf">
      {step === "kyc" && <KycStep onVerified={() => setStep("fork")} />}

      {step === "fork" && (
        <div className="wf-card">
          <span className="wf-eyebrow">Il bivio</span>
          <h2 className="wf-title">Cosa vuoi che succeda al tuo volto?</h2>
          <div className="wf-fork">
            <button type="button" className="wf-fork-card open" onClick={() => router.push("/account")}>
              <h3>Avatar aperto</h3>
              <p>Disponibile alla generazione su licenza, guadagni royalty a ogni utilizzo. Lo configuri dal tuo account.</p>
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
