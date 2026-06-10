"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface VerifyResult {
  valid: boolean;
  type?: "avatar" | "content";
  alias?: string;
  handle?: string;
  tier?: string;
  status?: string;
  consent_start?: string;
  revoked_at?: string | null;
  generated_at?: string;
  category?: string | null;
  marked?: boolean;   // immagine: filigrana invisibile trovata?
  source?: "image";   // origine della verifica
  certificate?: string;
  // Fallback senza filigrana: riconoscimento del volto contro il registro
  // (calcolato sul dispositivo, indizio MAI prova).
  face?: {
    scanned: boolean;        // l'analisi del volto è stata possibile?
    face_found: boolean;     // c'era un volto nell'immagine?
    match: boolean;
    handle?: string;
    alias?: string;
    status?: string;
    revoked_at?: string | null;
    similarity?: number;
    avatars_checked?: number;
  };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

export default function VerifyClient({ initialToken = "" }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);

  // Se arriviamo con ?token=<cert> in URL, verifichiamo subito (una sola volta).
  const autoRan = useRef(false);
  useEffect(() => {
    if (initialToken && !autoRan.current) {
      autoRan.current = true;
      verify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify() {
    if (!token.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/verify?token=${encodeURIComponent(token.trim())}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false });
    }
    setLoading(false);
  }

  const [imgStage, setImgStage] = useState<string | null>(null);

  async function verifyImage(file: File) {
    setImgLoading(true);
    setResult(null);
    try {
      setImgStage("Leggo la filigrana invisibile…");
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/verify-image", { method: "POST", body: fd });
      const data = await res.json();

      if (!data.valid && !data.marked) {
        // Nessuna filigrana: fallback = riconoscimento del volto contro il
        // registro. Il descrittore si calcola QUI sul dispositivo (face-api,
        // stessi modelli del KYC); al server viaggia solo il vettore.
        setImgStage("Nessuna filigrana — analizzo il volto…");
        const face = await faceFallback(file);
        setResult({ ...data, source: "image", face });
      } else {
        setResult({ ...data, source: "image" });
      }
    } catch {
      setResult({ valid: false, source: "image" });
    }
    setImgStage(null);
    setImgLoading(false);
  }

  // Non lancia mai: il fallback è best-effort, l'esito filigrana resta valido.
  async function faceFallback(file: File): Promise<VerifyResult["face"]> {
    try {
      const { descriptorForFile } = await import("@/lib/face-match");
      const descriptor = await descriptorForFile(file);
      if (!descriptor) return { scanned: true, face_found: false, match: false };
      const res = await fetch("/api/verify-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor }),
      });
      if (!res.ok) return { scanned: false, face_found: true, match: false };
      const data = await res.json();
      return { ...data, scanned: Boolean(data.scanned), face_found: true, match: Boolean(data.match) };
    } catch {
      return { scanned: false, face_found: false, match: false };
    }
  }

  return (
    <div>
      {/* Input */}
      <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem", marginBottom: "1rem" }}>
        <label style={{ display: "block", color: "#6b7280", fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
          TOKEN AVATAR O CERTIFICATO CONTENUTO
        </label>
        <textarea
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Incolla il token dell'avatar o il certificato (SHA-256)..."
          rows={3}
          style={{
            width: "100%",
            background: "#0a0a0f",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            color: "#f0f0f5",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            padding: "0.75rem",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); verify(); } }}
        />
        <button
          onClick={verify}
          disabled={loading || !token.trim()}
          style={{
            marginTop: "0.75rem",
            width: "100%",
            padding: "0.75rem",
            borderRadius: 10,
            border: "none",
            background: token.trim() ? "linear-gradient(135deg,#6B21E8,#B8005C)" : "#1c1c28",
            color: token.trim() ? "#fff" : "#4b5563",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: token.trim() ? "pointer" : "not-allowed",
            transition: "opacity 0.2s",
          }}
        >
          {loading ? "Verifica in corso..." : "Verifica"}
        </button>
      </div>

      {/* Verifica da immagine — la filigrana invisibile */}
      <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "1.5rem", marginBottom: "1rem" }}>
        <label style={{ display: "block", color: "#6b7280", fontSize: "0.75rem", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>
          OPPURE VERIFICA UN&apos;IMMAGINE
        </label>
        <p style={{ color: "#374151", fontSize: "0.78rem", lineHeight: 1.5, margin: "0 0 0.9rem" }}>
          Carica un&apos;immagine: leggiamo la <strong style={{ color: "#9ca3af" }}>filigrana invisibile</strong> nascosta nei pixel e ti diciamo se è un contenuto Human2AI, di chi e con quale consenso.
          Se la filigrana non c&apos;è, <strong style={{ color: "#9ca3af" }}>analizziamo il volto</strong> e lo confrontiamo col registro: se appartiene a una persona iscritta, lo scopri comunque.
        </p>
        <label
          style={{
            display: "block", textAlign: "center", padding: "0.75rem", borderRadius: 10,
            border: "1px dashed rgba(0,168,150,0.4)", background: "rgba(0,168,150,0.06)",
            color: imgLoading ? "#4b5563" : "#00A896", fontWeight: 700, fontSize: "0.88rem",
            cursor: imgLoading ? "default" : "pointer",
          }}
        >
          {imgLoading ? (imgStage ?? "Analisi in corso…") : "Scegli un'immagine"}
          <input
            type="file"
            accept="image/*"
            disabled={imgLoading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) verifyImage(f); e.currentTarget.value = ""; }}
            style={{ display: "none" }}
          />
        </label>
        <p style={{ color: "#374151", fontSize: "0.68rem", lineHeight: 1.5, margin: "0.7rem 0 0" }}>
          La filigrana invisibile sopravvive ai PNG scaricati da Human2AI. Screenshot e ricompressioni pesanti possono cancellarla.
        </p>
      </div>

      {/* Risultato */}
      {result && (
        <div style={{
          background: "#12121a",
          border: `1px solid ${result.valid ? "rgba(0,168,150,0.3)" : "rgba(184,0,92,0.3)"}`,
          borderRadius: 16,
          padding: "1.5rem",
        }}>
          {result.valid ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,168,150,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00A896" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <p style={{ color: "#00A896", fontWeight: 700, fontSize: "1rem", margin: 0 }}>
                    {result.type === "content" ? "Contenuto VERIFICATO" : "Token VALIDO"}
                  </p>
                  <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: 0 }}>
                    {result.type === "content"
                      ? "Generato tramite Human2AI da una persona reale consenziente"
                      : "Consenso verificato nel registro Human2AI"}
                  </p>
                </div>
              </div>

              {result.type === "content" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <p style={{ color: "#6b7280", fontSize: "0.72rem", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>GENERATO IL</p>
                    <p style={{ color: "#f0f0f5", fontWeight: 600, margin: 0 }}>{result.generated_at ? formatDate(result.generated_at) : "—"}</p>
                  </div>
                  <div>
                    <p style={{ color: "#6b7280", fontSize: "0.72rem", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>CATEGORIA D&apos;USO</p>
                    <p style={{ color: "#f0f0f5", fontWeight: 600, margin: 0 }}>{result.category ?? "—"}</p>
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <p style={{ color: "#6b7280", fontSize: "0.72rem", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>AVATAR</p>
                  <p style={{ color: "#f0f0f5", fontWeight: 600, margin: 0 }}>{result.alias}</p>
                  <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0.1rem 0 0" }}>@{result.handle}</p>
                </div>
                <div>
                  <p style={{ color: "#6b7280", fontSize: "0.72rem", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>STATO CONSENSO</p>
                  {result.status === "ATTIVO" ? (
                    <span style={{ color: "#00c864", fontWeight: 700 }}>● ATTIVO</span>
                  ) : (
                    <span style={{ color: "#B8005C", fontWeight: 700 }}>✕ REVOCATO</span>
                  )}
                </div>
                <div>
                  <p style={{ color: "#6b7280", fontSize: "0.72rem", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>AUTORIZZATO DAL</p>
                  <p style={{ color: "#f0f0f5", fontWeight: 600, margin: 0 }}>{result.consent_start ? formatDate(result.consent_start) : "—"}</p>
                </div>
                {result.revoked_at && (
                  <div>
                    <p style={{ color: "#6b7280", fontSize: "0.72rem", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>REVOCATO DAL</p>
                    <p style={{ color: "#B8005C", fontWeight: 600, margin: 0 }}>{formatDate(result.revoked_at)}</p>
                  </div>
                )}
              </div>

              {result.type === "content" && result.status === "REVOCATO" && (
                <p style={{ color: "#B8005C", fontSize: "0.78rem", lineHeight: 1.5, margin: "1rem 0 0", background: "rgba(184,0,92,0.06)", border: "1px solid rgba(184,0,92,0.25)", borderRadius: 8, padding: "0.7rem 0.9rem" }}>
                  Il consenso è stato revocato <strong>dopo</strong> questa generazione. La revoca è prospettica:
                  blocca gli usi futuri, mentre questo contenuto resta tracciato e attribuito.
                </p>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
                <Link href={`/passport/${result.handle}`} style={{ display: "inline-block", color: "#6B21E8", fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(107,33,232,0.3)", borderRadius: 8, padding: "0.4rem 0.9rem" }}>
                  Vai al Passport →
                </Link>
                <Link
                  href={result.type === "content"
                    ? `/report?cert=${encodeURIComponent(result.certificate ?? token.trim())}`
                    : `/report?handle=${encodeURIComponent(result.handle ?? "")}`}
                  style={{ color: "#6b7280", fontSize: "0.82rem", textDecoration: "none" }}
                >
                  Segnala abuso
                </Link>
              </div>
            </>
          ) : result.face?.match ? (
            /* Nessuna filigrana, MA il volto corrisponde a un avatar del registro:
               probabile generazione NON autorizzata fatta fuori da Human2AI.
               Indizio, mai prova: la persona può partire da qui per il ricorso. */
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(184,0,92,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B8005C" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div>
                  <p style={{ color: "#B8005C", fontWeight: 700, fontSize: "1rem", margin: 0 }}>
                    CONTENUTO NON CERTIFICATO — volto riconosciuto
                  </p>
                  <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: 0 }}>
                    Nessuna filigrana Human2AI, ma il volto corrisponde a una persona del registro.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <p style={{ color: "#6b7280", fontSize: "0.72rem", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>VOLTO RICONOSCIUTO</p>
                  <p style={{ color: "#f0f0f5", fontWeight: 600, margin: 0 }}>{result.face.alias}</p>
                  <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0.1rem 0 0" }}>@{result.face.handle}</p>
                </div>
                <div>
                  <p style={{ color: "#6b7280", fontSize: "0.72rem", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>SOMIGLIANZA</p>
                  <p style={{ color: "#f0f0f5", fontWeight: 600, margin: 0 }}>~{result.face.similarity}%</p>
                </div>
                <div>
                  <p style={{ color: "#6b7280", fontSize: "0.72rem", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>STATO CONSENSO</p>
                  {result.face.status === "ATTIVO" ? (
                    <span style={{ color: "#00c864", fontWeight: 700 }}>● ATTIVO</span>
                  ) : (
                    <span style={{ color: "#B8005C", fontWeight: 700 }}>✕ REVOCATO</span>
                  )}
                </div>
              </div>

              <p style={{ color: "#B8005C", fontSize: "0.78rem", lineHeight: 1.5, margin: "0 0 1rem", background: "rgba(184,0,92,0.06)", border: "1px solid rgba(184,0,92,0.25)", borderRadius: 8, padding: "0.7rem 0.9rem" }}>
                Ogni contenuto autorizzato da Human2AI porta la filigrana col certificato. Questa immagine
                non la porta: con ogni probabilità è stata generata <strong>fuori</strong> da Human2AI,
                senza il consenso della persona{result.face.status === "REVOCATO" ? " — che ha persino revocato il proprio volto" : ""}.
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <Link href={`/report?handle=${encodeURIComponent(result.face.handle ?? "")}`} style={{ display: "inline-block", color: "#fff", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none", background: "#B8005C", borderRadius: 8, padding: "0.5rem 1rem" }}>
                  Segnala questo contenuto →
                </Link>
                <Link href={`/passport/${result.face.handle}`} style={{ color: "#6B21E8", fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(107,33,232,0.3)", borderRadius: 8, padding: "0.4rem 0.9rem" }}>
                  Vai al Passport
                </Link>
              </div>

              <p style={{ color: "#374151", fontSize: "0.68rem", lineHeight: 1.5, margin: "1rem 0 0" }}>
                Il riconoscimento del volto è calcolato sul tuo dispositivo ed è un <strong>indizio</strong>,
                non una prova: la prova di autorizzazione è la filigrana col certificato.
              </p>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(184,0,92,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B8005C" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <div>
                <p style={{ color: "#B8005C", fontWeight: 700, fontSize: "1rem", margin: 0 }}>
                  {result.source === "image" ? "NESSUNA FILIGRANA" : "NON VALIDO"}
                </p>
                <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: 0 }}>
                  {result.source === "image"
                    ? (result.marked
                        ? "Immagine marcata Human2AI, ma il certificato non risulta nel registro."
                        : "Nessuna filigrana Human2AI in questa immagine (o è stata rimossa da screenshot/ricompressione).")
                    : "Questo codice non corrisponde a nessun avatar né contenuto nel registro."}
                </p>
                {result.source === "image" && !result.marked && result.face && (
                  <p style={{ color: "#6b7280", fontSize: "0.78rem", margin: "0.35rem 0 0" }}>
                    {result.face.scanned && result.face.face_found
                      ? "Abbiamo analizzato anche il volto: nessuna corrispondenza con le persone del registro."
                      : result.face.scanned && !result.face.face_found
                        ? "Nell'immagine non è stato rilevato un volto analizzabile."
                        : "L'analisi del volto non è al momento disponibile."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
