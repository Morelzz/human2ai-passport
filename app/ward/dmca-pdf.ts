import type { DmcaNotice } from "@/lib/ward/takedown";

// PDF della DMCA notice generato NEL BROWSER (import dinamico di jsPDF: non entra
// nel bundle finche' non serve). Niente render server, niente file salvato. Il
// testo viene dal core (notice.body), unica fonte di verita'.
export async function downloadDmcaPdf(notice: DmcaNotice, host: string | null) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;

  doc.setFontSize(16);
  doc.text("Semblic", margin, y);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Richiesta di rimozione assistita", margin, y + 14);
  y += 40;

  doc.setTextColor(20);
  doc.setFontSize(10);
  for (const line of notice.body.split("\n")) {
    const wrapped = doc.splitTextToSize(line || " ", 515 - margin);
    if (y > 760) { doc.addPage(); y = margin; }
    doc.text(wrapped, margin, y);
    y += wrapped.length * 13 + 2;
  }

  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    "Questo documento non e' consulenza legale. Semblic prepara la richiesta, l'invio spetta a te.",
    margin,
    812,
  );

  const safeHost = (host ?? "copia").replace(/[^a-z0-9.]/gi, "_");
  doc.save(`dmca-${safeHost}.pdf`);
}
