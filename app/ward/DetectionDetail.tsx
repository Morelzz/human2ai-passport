import type { WardDetection } from "./demo";

// STUB temporaneo: nel Task 3 diventa il dettaglio coi 3 comportamenti di
// sicurezza (standard / sensibile-sfocato / minore-locked).
export function DetectionDetail({ detection, onBack }: { detection: WardDetection; onBack: () => void }) {
  return (
    <section className="screen on">
      <button type="button" className="mini-act" style={{ width: "auto", marginBottom: 12 }} onClick={onBack}>
        &larr; indietro
      </button>
      <div className="h-row"><h2>{detection.sensitivity === "minor" ? "Bloccato" : detection.dom}</h2></div>
      <p style={{ fontFamily: "var(--font-ward-mono)", fontSize: 12, color: "var(--ward-muted)" }}>
        Dettaglio in arrivo (Task 3): qui andranno i 3 comportamenti di sicurezza.
      </p>
    </section>
  );
}
