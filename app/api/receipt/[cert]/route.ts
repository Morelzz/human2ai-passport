import { NextResponse } from "next/server";
import { buildComplianceReceipt } from "@/lib/receipt";

export const runtime = "nodejs";

// Fase 3.3 (readiness enterprise): RICEVUTA DI CONFORMITA' scaricabile. Attesta
// che una generazione e' passata dal percorso di consenso verificato di Semblic.
// Pensata per l'archivio audit dell'azienda (seme del futuro Consent Receipt API).
// Accesso col CERTIFICATO (segreto-nell'URL, come /api/content/[cert] e /verify):
// ce l'ha chi ha generato. Nessun dato personale: solo l'identita' PUBBLICA
// dell'avatar (handle/alias) + l'ambito di consenso, mai biometria o dati del buyer.
export async function GET(request: Request, { params }: { params: Promise<{ cert: string }> }) {
  const { cert } = await params;
  if (!cert || cert.length < 16) return NextResponse.json({ error: "Certificato non valido" }, { status: 400 });

  const receipt = await buildComplianceReceipt(cert, new Date().toISOString());
  if (!receipt) return NextResponse.json({ error: "Ricevuta non trovata per questo certificato" }, { status: 404 });

  const headers: Record<string, string> = { "Content-Type": "application/json; charset=utf-8" };
  if (new URL(request.url).searchParams.get("download") === "1") {
    headers["Content-Disposition"] = `attachment; filename="conformita-${cert.slice(0, 12)}.json"`;
  }
  return new NextResponse(JSON.stringify(receipt, null, 2), { headers });
}
