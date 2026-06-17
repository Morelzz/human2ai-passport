"use client";

// Bottone "Stampa / Salva come PDF": apre il dialogo di stampa del browser, da
// cui l'azienda salva la ricevuta in PDF. Nascosto nella stampa stessa (.no-print).
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        padding: "0.65rem 1.3rem",
        borderRadius: 10,
        border: "none",
        background: "#F2A93B",
        color: "#0C0F17",
        fontWeight: 700,
        fontSize: "0.9rem",
        cursor: "pointer",
      }}
    >
      Stampa / Salva come PDF
    </button>
  );
}
