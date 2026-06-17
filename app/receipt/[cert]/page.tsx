import { notFound } from "next/navigation";
import { buildComplianceReceipt } from "@/lib/receipt";
import PrintButton from "./PrintButton";

export const runtime = "nodejs";

interface Props {
  params: Promise<{ cert: string }>;
}

// Documento di audit, non una superficie pubblica: niente indicizzazione.
export async function generateMetadata() {
  return { title: "Ricevuta di conformità", robots: { index: false, follow: false } };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

// Riga del documento: etichetta a sinistra, valore a destra, hairline sotto.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1.5rem", padding: "0.7rem 0", borderBottom: "1px solid #ececf0" }}>
      <span style={{ color: "#6b7280", fontSize: "0.82rem" }}>{label}</span>
      <span style={{ color: "#1a1a1a", fontSize: "0.9rem", fontWeight: 600, textAlign: "right" }}>{children}</span>
    </div>
  );
}

export default async function ReceiptPage({ params }: Props) {
  const { cert } = await params;
  const r = await buildComplianceReceipt(cert, new Date().toISOString());
  if (!r) notFound();

  const printCss = `
    @media print {
      .no-print { display: none !important; }
      .page-bg { background: #ffffff !important; padding: 0 !important; }
      .paper { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
    }
    .receipt-link { color: #F2A93B; text-decoration: none; overflow-wrap: anywhere; }
    .receipt-link:hover { text-decoration: underline; }
  `;

  return (
    <div className="page-bg" style={{ background: "#eef0f3", minHeight: "100vh", padding: "2.5rem 1rem", fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <style>{printCss}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Barra azioni: solo a schermo, mai nella stampa */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.2rem", flexWrap: "wrap" }}>
          <a href="/account" className="receipt-link" style={{ fontSize: "0.85rem", fontWeight: 600 }}>← I miei contenuti</a>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
            <a href={`/api/receipt/${encodeURIComponent(r.certificate)}?download=1`} className="receipt-link" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Scarica JSON</a>
            <PrintButton />
          </div>
        </div>

        {/* Il foglio */}
        <div className="paper" style={{ background: "#ffffff", color: "#1a1a1a", border: "1px solid #e3e6ea", borderRadius: 14, padding: "2.6rem 2.4rem", boxShadow: "0 10px 40px rgba(0,0,0,0.08)" }}>
          {/* Intestazione */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 800, letterSpacing: "0.16em", fontSize: "1.05rem" }}>SEMBLIC</div>
            <div style={{ color: "#6b7280", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Registro dei diritti d&apos;immagine</div>
          </div>
          {/* Barra tricolore del brand */}
          <div style={{ height: 3, borderRadius: 2, marginTop: "0.9rem", background: "linear-gradient(90deg,#F2A93B,#B8005C,#00A896)" }} />

          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "1.6rem 0 0.3rem" }}>Ricevuta di conformità del consenso</h1>
          <p style={{ color: "#6b7280", fontSize: "0.82rem", margin: 0 }}>Emessa il {fmtDate(r.issued_at)} da {r.issuer}</p>

          {/* Campi */}
          <div style={{ marginTop: "1.8rem" }}>
            <Field label="Certificato">
              <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.8rem", wordBreak: "break-all" }}>{r.certificate}</code>
            </Field>
            <Field label="Persona del registro">
              {r.subject.alias ?? "—"}{r.subject.handle ? <span style={{ color: "#6b7280", fontWeight: 400 }}> · @{r.subject.handle}</span> : null}
            </Field>
            {r.subject.registry_url && (
              <Field label="Passaporto pubblico">
                <a href={r.subject.registry_url} className="receipt-link">{r.subject.registry_url}</a>
              </Field>
            )}
            <Field label="Data della generazione">{r.generation.date}</Field>
            <Field label="Categoria d&apos;uso">{r.generation.category ?? "non specificata"}</Field>
            <Field label="Modalità">{r.generation.mode}</Field>
          </div>

          {/* Esito consenso */}
          <div style={{ marginTop: "1.8rem", border: "1px solid #e3e6ea", borderRadius: 12, padding: "1.2rem 1.3rem", background: "#fafbfc" }}>
            <p style={{ margin: "0 0 0.9rem", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7280" }}>Esito del consenso</p>
            <ConsentLine ok label="Persona reale verificata nel registro" />
            <ConsentLine ok label={`Consenso prestato dal ${fmtDate(r.consent.consent_since)}`} />
            <ConsentLine ok={r.consent.category_in_scope} label={r.consent.category_in_scope ? "Categoria nell'ambito autorizzato" : "Categoria fuori dall'ambito corrente"} />
            {r.consent.revoked ? (
              <ConsentLine ok={false} label={`Consenso revocato dal ${fmtDate(r.consent.revoked_at)} (revoca prospettica: questa generazione passata resta autorizzata)`} />
            ) : (
              <ConsentLine ok label="Consenso attivo alla data di emissione" />
            )}
          </div>

          {/* Dichiarazione */}
          <p style={{ marginTop: "1.6rem", fontSize: "0.86rem", lineHeight: 1.7, color: "#374151" }}>{r.statement}</p>

          {/* Piè di pagina: verifica indipendente */}
          <div style={{ marginTop: "1.8rem", paddingTop: "1.2rem", borderTop: "1px solid #e3e6ea", color: "#6b7280", fontSize: "0.76rem", lineHeight: 1.6 }}>
            Documento generato automaticamente. Chiunque può verificare il certificato in autonomia su{" "}
            <a href={r.verification_url} className="receipt-link">{r.verification_url}</a>. Nessun dato biometrico o personale è contenuto in questa ricevuta.
          </div>
        </div>
      </div>
    </div>
  );
}

// Riga dell'esito: pallino verde (ok) o cremisi (non ok) + testo.
function ConsentLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", padding: "0.3rem 0" }}>
      <span aria-hidden style={{ marginTop: 3, width: 14, height: 14, flexShrink: 0, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: ok ? "#0a8a78" : "#b8005c", color: "#fff", fontSize: "0.62rem", fontWeight: 900 }}>
        {ok ? "✓" : "!"}
      </span>
      <span style={{ fontSize: "0.85rem", color: "#1a1a1a", lineHeight: 1.5 }}>{label}</span>
    </div>
  );
}
