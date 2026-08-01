"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IDENTITY_KIT, IDENTITY_LABELS } from "@/lib/types";
import { POSES, PoseGlyph } from "@/components/avatar/poses";
import { computeFaceMatchFromSrcs, type FaceMatchResult } from "@/lib/face-match";
import { classifyIdentityMatch } from "@/lib/identity-match";

export default function NewAvatarClient({ defaultAlias, isEnterprise = false }: { defaultAlias: string; isEnterprise?: boolean }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [alias, setAlias] = useState(defaultAlias);
  // Profilo pubblico facoltativo (passport): nome reale + social
  const [realName, setRealName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [commercialConsent, setCommercialConsent] = useState(true);
  const [kit, setKit] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [consentUrl, setConsentUrl] = useState<string | null>(null);
  const [submittedPending, setSubmittedPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refs, setRefs] = useState<(string | null)[]>(() => Array(POSES.length).fill(null));
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeNote, setAnalyzeNote] = useState<string | null>(null);
  // Verifica identità (Fase 3b): documento (fronte) + selfie. Il match foto↔doc↔selfie
  // si calcola SUL DISPOSITIVO e aiuta i nostri operatori a certificare che sei tu.
  const [docFront, setDocFront] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [matchRaw, setMatchRaw] = useState<FaceMatchResult | null>(null);
  const [matching, setMatching] = useState(false);

  const kitComplete = (Object.keys(IDENTITY_KIT) as (keyof typeof IDENTITY_KIT)[]).every((f) => kit[f]);
  const photoCount = refs.filter((d) => !!d).length;
  const verdict = matchRaw ? classifyIdentityMatch(matchRaw) : null;

  // Appena ci sono documento + selfie + almeno una foto, leggo i volti sul
  // dispositivo (face-api, modelli locali): niente pixel verso l'esterno qui.
  useEffect(() => {
    if (isEnterprise || !docFront || !selfie || photoCount === 0) { setMatchRaw(null); return; }
    let cancelled = false;
    setMatching(true);
    (async () => {
      const photos = refs.filter((d): d is string => !!d);
      const r = await computeFaceMatchFromSrcs(docFront, selfie, photos);
      if (cancelled) return;
      setMatchRaw(r);
      setMatching(false);
    })();
    return () => { cancelled = true; };
    // refs è letto dentro ma la dipendenza utile è il numero di foto: ricalcolo
    // quando cambiano documento, selfie o quante foto ci sono.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docFront, selfie, photoCount, isEnterprise]);

  async function pickPhoto(slot: number, file?: File) {
    if (!file) return;
    try {
      const d = await resizeFile(file);
      setRefs((a) => { const n = [...a]; n[slot] = d; return n; });
    } catch {
      setError("Immagine non leggibile, riprova.");
    }
  }

  // Documento e selfie: uno slot singolo a testa (resize sul client come le foto).
  async function pickSingle(setter: (d: string | null) => void, file?: File) {
    if (!file) return;
    try { setter(await resizeFile(file)); }
    catch { setError("Immagine non leggibile, riprova."); }
  }

  // Claude SUGGERISCE i campi visivi dell'identikit dalle foto; la persona conferma.
  async function analyze() {
    const imgs = refs.filter((d): d is string => !!d);
    if (imgs.length === 0) { setAnalyzeNote("Carica almeno una foto per l'analisi."); return; }
    setAnalyzing(true); setAnalyzeNote(null);
    try {
      const res = await fetch("/api/avatar/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imgs }),
      });
      const json = await res.json();
      if (!res.ok) { setAnalyzeNote(json.error ?? "Analisi non riuscita."); }
      else {
        const s = (json.suggestions ?? {}) as Record<string, string>;
        setKit((k) => ({ ...k, ...s }));
        const n = Object.keys(s).length;
        setAnalyzeNote(n > 0
          ? `Pre-compilati ${n} campi da Claude, controllali e conferma. L'etnia dichiarala tu (dato sensibile).`
          : "Nessun campo proposto con sicurezza: compila l'identikit a mano.");
      }
    } catch {
      setAnalyzeNote("Analisi non riuscita.");
    }
    setAnalyzing(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!kitComplete) { setError("Completa tutti i campi dell'identity kit"); return; }
    if (!commercialConsent) { setError("Per creare un avatar serve il consenso all'uso commerciale. Per la sola protezione del volto usa Ward."); return; }
    // L'avatar nasce a livello ECHO (identity-lock): senza foto non sarebbe generabile.
    if (refs.every((d) => !d)) {
      setError("Carica almeno una foto: bloccano l'identità reale per le generazioni fedeli.");
      return;
    }
    // Verifica identità (solo privati): documento + selfie servono alla certificazione manuale.
    if (!isEnterprise && (!docFront || !selfie)) {
      setError("Carica il documento (fronte) e un selfie: ci servono per certificare a mano che l'avatar sei tu.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch("/api/avatar/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle, alias, commercial_consent: commercialConsent, ...kit,
        real_name: realName, instagram, facebook,
        references: refs.map((d, slot) => (d ? { slot, data: d } : null)).filter(Boolean),
        document_front: docFront,
        selfie,
        face_match: matchRaw,
      }),
    });
    let json: { error?: string; consent_url?: string; handle?: string } = {};
    try { json = await res.json(); } catch { /* es. 413: risposta senza JSON */ }
    if (!res.ok) {
      setError(res.status === 413
        ? "Le foto sono troppo grandi o troppe per l'invio: riprova con meno foto o immagini più leggere."
        : (json.error ?? "Errore nella creazione, riprova."));
      setLoading(false);
      return;
    }
    // Enterprise: l'avatar è in attesa del consenso della persona -> mostra il link.
    if (json.consent_url) {
      setConsentUrl(json.consent_url);
      setLoading(false);
      return;
    }
    // Privato: l'avatar NON va live in automatico, entra in certificazione.
    setSubmittedPending(true);
    setLoading(false);
    router.refresh();
  }

  return (
      <section style={{ maxWidth: 560, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {consentUrl ? (
          <div style={{ background: "var(--surface)", border: "1px solid rgba(127,174,150,0.3)", borderRadius: 18, padding: "2rem" }}>
            <p style={{ color: "var(--verified-c)", fontWeight: 800, fontSize: "1.1rem", margin: "0 0 0.5rem" }}>✓ Avatar creato, in attesa del consenso</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 1.2rem" }}>
              Condividi questo link con la persona. Solo lei, aprendolo, conferma il consenso.
              Dopo la conferma, l&apos;avatar passa alla revisione dei nostri operatori.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <code style={{ flex: 1, minWidth: 200, background: "var(--bg)", border: "1px solid var(--hairline)", borderRadius: 8, padding: "0.6rem 0.8rem", color: "#F2A93B", fontSize: "0.78rem", wordBreak: "break-all" }}>{consentUrl}</code>
              <button type="button" onClick={() => { navigator.clipboard.writeText(consentUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                style={{ padding: "0.6rem 1rem", borderRadius: 8, border: "1px solid rgba(242,169,59,0.3)", background: "rgba(242,169,59,0.12)", color: copied ? "var(--verified-c)" : "#F2A93B", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                {copied ? "✓ Copiato" : "Copia"}
              </button>
            </div>
            <Link href="/account" style={{ display: "inline-block", marginTop: "1.5rem", color: "var(--text-muted)", fontSize: "0.85rem", textDecoration: "none" }}>← Torna all&apos;account</Link>
          </div>
        ) : submittedPending ? (
          <div style={{ background: "var(--surface)", border: "1px solid rgba(127,174,150,0.3)", borderRadius: 18, padding: "2rem" }}>
            <p style={{ color: "var(--verified-c)", fontWeight: 800, fontSize: "1.1rem", margin: "0 0 0.5rem" }}>✓ Avatar inviato per la certificazione</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 1.2rem" }}>
              Prima di andare live certifichiamo a mano che il volto dell&apos;avatar sia la stessa persona della tua verifica d&apos;identità. Appena approvato il tuo avatar diventa pubblico e ti avvisiamo.
            </p>
            <Link href="/account" style={{ display: "inline-block", color: "var(--text-muted)", fontSize: "0.85rem", textDecoration: "none" }}>← Vai all&apos;account</Link>
          </div>
        ) : (
        <>
        <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
          {isEnterprise ? "Onboarda un avatar" : "Crea il tuo avatar"}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
          {isEnterprise
            ? "Inserisci i dati della persona. Dopo la creazione riceverai un link da farle aprire per il consenso; poi l'avatar passa alla revisione dei nostri operatori prima di andare live."
            : "Entrerai nel registro pubblico con un token verificabile. La revoca sarà sempre possibile e prospettica (blocca gli usi futuri, non il passato)."}
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
          <div>
            <label htmlFor="av-alias" style={lbl}>Nome pubblico</label>
            <input id="av-alias" value={alias} onChange={(e) => setAlias(e.target.value)} required style={inp} />
          </div>

          <div>
            <label htmlFor="av-handle" style={lbl}>Handle (l&apos;indirizzo del tuo passport)</label>
            <input id="av-handle" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} placeholder="es. riccardo-t" required style={inp} />
            <p style={{ color: "var(--text-faint)", fontSize: "0.72rem", margin: "0.35rem 0 0" }}>
              semblic…/passport/<strong>{handle || "tuo-handle"}</strong>
            </p>
          </div>

          {/* Profilo pubblico opzionale: nome reale e social sul passport */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)", borderRadius: 12, padding: "1.2rem" }}>
            <p style={{ color: "var(--text)", fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.3rem" }}>Profilo pubblico · facoltativo</p>
            <p style={{ color: "var(--text-faint)", fontSize: "0.72rem", margin: "0 0 1rem", lineHeight: 1.5 }}>
              Se vuoi, sul passport possono comparire il tuo <strong>nome e cognome</strong> e i tuoi <strong>canali social</strong>. Tutto facoltativo: decidi tu quanto essere riconoscibile.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <div>
                <label htmlFor="av-realname" style={lbl}>Nome e cognome (pubblico sul passport)</label>
                <input id="av-realname" value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="es. Manuel Caso" style={inp} />
              </div>
              <div>
                <label htmlFor="av-instagram" style={lbl}>Instagram</label>
                <input id="av-instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@tuo-profilo o URL" style={inp} />
              </div>
              <div>
                <label htmlFor="av-facebook" style={lbl}>Facebook</label>
                <input id="av-facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="tuo-profilo o URL" style={inp} />
              </div>
            </div>
          </div>

          {/* Le tue foto — reference-set per l'identity-lock (ECHO) */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)", borderRadius: 12, padding: "1.2rem" }}>
            <p style={{ color: "var(--text)", fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.3rem" }}>Le tue foto · 8 pose</p>
            <p style={{ color: "var(--text-faint)", fontSize: "0.72rem", margin: "0 0 1rem", lineHeight: 1.5 }}>
              Bloccano l&apos;identità reale per le generazioni fotorealistiche (motore ECHO). Foto <strong>nitide, ben illuminate, sfondo neutro, senza filtri</strong>, almeno 1024px. Restano <strong>private e cifrate</strong>.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem" }}>
              {POSES.map((p, slot) => (
                <label key={p.key} title={p.tip} className="focus-ring"
                  style={{ cursor: "pointer", border: `1px dashed ${refs[slot] ? "#F2A93B" : "var(--hairline)"}`, borderRadius: 10, padding: "0.4rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.3rem", background: refs[slot] ? "rgba(242,169,59,0.08)" : "transparent", aspectRatio: "3 / 4", overflow: "hidden", position: "relative" }}>
                  {refs[slot] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={refs[slot]!} alt={p.label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <>
                      <PoseGlyph pose={p} />
                      <span style={{ color: "var(--text-muted)", fontSize: "0.58rem", fontWeight: 600, textAlign: "center", lineHeight: 1.15 }}>{p.label}</span>
                    </>
                  )}
                  <input type="file" accept="image/*" aria-label={`Carica foto: ${p.label}`} onChange={(e) => { pickPhoto(slot, e.target.files?.[0]); e.currentTarget.value = ""; }} className="sr-only" />
                </label>
              ))}
            </div>
            <button type="button" onClick={analyze} disabled={analyzing || refs.every((d) => !d)}
              style={{ marginTop: "1rem", width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid rgba(242,169,59,0.3)", background: "rgba(242,169,59,0.12)", color: "#F2A93B", fontWeight: 700, fontSize: "0.8rem", cursor: analyzing || refs.every((d) => !d) ? "default" : "pointer", opacity: refs.every((d) => !d) ? 0.5 : 1 }}>
              {analyzing ? "Analisi in corso…" : "✨ Analizza le foto e compila l'identikit"}
            </button>
            {analyzeNote && <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", margin: "0.6rem 0 0", lineHeight: 1.5 }}>{analyzeNote}</p>}
          </div>

          {/* Verifica identità (Fase 3b): documento + selfie -> match sul dispositivo */}
          {!isEnterprise && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)", borderRadius: 12, padding: "1.2rem" }}>
            <p style={{ color: "var(--text)", fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.3rem" }}>Verifica che sei tu</p>
            <p style={{ color: "var(--text-faint)", fontSize: "0.72rem", margin: "0 0 1rem", lineHeight: 1.5 }}>
              Confrontiamo il tuo <strong>documento</strong> (fronte), un <strong>selfie</strong> e le tue foto. Il confronto avviene <strong>sul tuo dispositivo</strong> e ci aiuta a certificare a mano che l&apos;avatar sei davvero tu. Documento e selfie restano <strong>privati e cifrati</strong>.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <label title="Documento d'identità, lato con la foto" className="focus-ring"
                style={{ cursor: "pointer", border: `1px dashed ${docFront ? "#F2A93B" : "var(--hairline)"}`, borderRadius: 10, padding: "0.4rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.3rem", background: docFront ? "rgba(242,169,59,0.08)" : "transparent", aspectRatio: "4 / 3", overflow: "hidden", position: "relative" }}>
                {docFront ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={docFront} alt="Documento" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <>
                    <DocGlyph />
                    <span style={{ color: "var(--text-muted)", fontSize: "0.62rem", fontWeight: 600, textAlign: "center" }}>Documento (fronte)</span>
                  </>
                )}
                <input type="file" accept="image/*" aria-label="Carica documento (fronte)" onChange={(e) => { pickSingle(setDocFront, e.target.files?.[0]); e.currentTarget.value = ""; }} className="sr-only" />
              </label>
              <label title="Un selfie frontale, ben illuminato" className="focus-ring"
                style={{ cursor: "pointer", border: `1px dashed ${selfie ? "#F2A93B" : "var(--hairline)"}`, borderRadius: 10, padding: "0.4rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.3rem", background: selfie ? "rgba(242,169,59,0.08)" : "transparent", aspectRatio: "4 / 3", overflow: "hidden", position: "relative" }}>
                {selfie ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selfie} alt="Selfie" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <>
                    <SelfieGlyph />
                    <span style={{ color: "var(--text-muted)", fontSize: "0.62rem", fontWeight: 600, textAlign: "center" }}>Selfie</span>
                  </>
                )}
                <input type="file" accept="image/*" aria-label="Carica selfie" onChange={(e) => { pickSingle(setSelfie, e.target.files?.[0]); e.currentTarget.value = ""; }} className="sr-only" />
              </label>
            </div>

            {(matching || verdict) && (
              <div style={{ marginTop: "1rem", background: "var(--bg)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "0.85rem" }}>
                {matching ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.74rem", margin: 0, lineHeight: 1.5 }}>Leggo i volti sul tuo dispositivo… (la prima analisi scarica i modelli)</p>
                ) : verdict ? (
                  <>
                    {[
                      { label: "Documento e selfie", leg: verdict.docSelfie },
                      { label: "Selfie e foto avatar", leg: verdict.selfiePhoto },
                    ].map(({ label, leg }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", padding: "0.2rem 0" }}>
                        <span style={{ color: "var(--text-muted)" }}>{label}</span>
                        {leg ? (
                          <span style={{ color: bandColor(leg.band), fontWeight: 700 }}>{leg.similarity}% {bandWord(leg.band)}</span>
                        ) : (
                          <span style={{ color: "var(--text-faint)", fontWeight: 600 }}>volto non leggibile</span>
                        )}
                      </div>
                    ))}
                    <div style={{ marginTop: "0.6rem", display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "0.35rem 0.8rem", fontSize: "0.72rem", fontWeight: 700, background: VERDICT_UI[verdict.verdict].bg, color: VERDICT_UI[verdict.verdict].color, border: `1px solid ${VERDICT_UI[verdict.verdict].border}` }}>
                      {VERDICT_UI[verdict.verdict].text}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
          )}

          {/* Identity kit — immutabile dopo la creazione */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)", borderRadius: 12, padding: "1.2rem" }}>
            <p style={{ color: "var(--text)", fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.3rem" }}>Identity kit</p>
            <p style={{ color: "var(--text-faint)", fontSize: "0.72rem", margin: "0 0 1.2rem", lineHeight: 1.5 }}>
              Le caratteristiche strutturali dell&apos;avatar. Si fissano ora e <strong>non saranno più modificabili</strong>: rappresentano la persona reale.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {(Object.keys(IDENTITY_KIT) as (keyof typeof IDENTITY_KIT)[]).map((field) => (
                <div key={field}>
                  <label style={{ ...lbl, marginBottom: "0.4rem" }}>{IDENTITY_LABELS[field]}</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {IDENTITY_KIT[field].map((opt) => {
                      const on = kit[field] === opt;
                      return (
                        <button key={opt} type="button" aria-pressed={on} className="focus-ring" onClick={() => setKit({ ...kit, [field]: opt })}
                          style={{ padding: "0.3rem 0.7rem", borderRadius: 999, fontSize: "0.76rem", fontWeight: 600, cursor: "pointer", background: on ? "rgba(242,169,59,0.15)" : "var(--surface)", color: on ? "var(--text)" : "var(--text-muted)", border: `1px solid ${on ? "#F2A93B" : "var(--hairline)"}` }}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={lbl}>Livello</label>
            <p style={{ color: "var(--text-faint)", fontSize: "0.72rem", margin: "0 0 0.6rem", lineHeight: 1.5 }}>
              Lo assegniamo noi in base alla scansione. Il tuo avatar nasce a livello ECHO.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ padding: "0.5rem 0.9rem", borderRadius: 10, background: "rgba(242,169,59,0.12)", border: "1px solid #F2A93B", color: "var(--text)", fontWeight: 700, fontSize: "0.8rem" }}>ECHO</span>
              <span style={{ padding: "0.5rem 0.9rem", borderRadius: 10, background: "var(--surface)", border: "1px dashed var(--hairline)", color: "var(--text-faint)", fontSize: "0.8rem" }}>HUMAN · in arrivo</span>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)", borderRadius: 12, padding: "1.2rem" }}>
            <label style={{ ...lbl, marginBottom: "0.8rem" }}>Consenso</label>
            <button type="button" role="switch" aria-checked={commercialConsent} className="focus-ring" onClick={() => setCommercialConsent((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: "0.8rem", width: "100%", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
              <span style={{ flex: "none", width: 40, height: 23, borderRadius: 999, background: commercialConsent ? "var(--verified-c)" : "var(--hairline)", position: "relative", transition: "background 0.15s" }}>
                <span style={{ position: "absolute", top: 2, left: commercialConsent ? 19 : 2, width: 19, height: 19, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
              </span>
              <span>
                <span style={{ display: "block", color: "var(--text)", fontSize: "0.85rem", fontWeight: 600 }}>Uso commerciale: {commercialConsent ? "consentito" : "non consentito"}</span>
                <span style={{ display: "block", color: "var(--text-faint)", fontSize: "0.72rem", marginTop: "0.2rem", lineHeight: 1.5 }}>Puoi revocare quando vuoi: la revoca blocca gli usi futuri, non il passato.</span>
              </span>
            </button>
          </div>

          {error && <p style={{ color: "var(--blocked-c)", fontSize: "0.85rem", margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ padding: "0.85rem", borderRadius: 10, border: "none", background: loading ? "var(--elevated)" : "#F2A93B", color: "#412402", fontWeight: 700, fontSize: "0.9rem", cursor: loading ? "default" : "pointer" }}>
            {loading ? "Creazione…" : isEnterprise ? "Crea avatar e genera link di consenso" : "Crea avatar e firma il consenso"}
          </button>
        </form>
        </>
        )}
      </section>
  );
}

// Le 8 pose canoniche e la loro icona vivono in components/avatar/poses
// (condivise con il KYC, che usa la stessa griglia).

// Ridimensiona un File a ≤1024px e ritorna un data-URL JPEG (payload leggero).
function resizeFile(file: File, max = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src = url;
  });
}

// Glyph per le tessere documento/selfie (coerenti con le icone outline del sito).
function DocGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" width="24" height="24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="11" r="2" /><path d="M14 9h4M14 13h4M5 16h8" />
    </svg>
  );
}
function SelfieGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" width="24" height="24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" /><circle cx="9.5" cy="10.5" r=".6" /><circle cx="14.5" cy="10.5" r=".6" /><path d="M9.5 15c.8.7 4.2.7 5 0" />
    </svg>
  );
}

// Colore/parola per banda del match (salvia=forte, amber=media, coral=bassa).
function bandColor(band: "strong" | "review" | "weak"): string {
  return band === "strong" ? "var(--verified-c)" : band === "review" ? "#F2A93B" : "var(--blocked-c)";
}
function bandWord(band: "strong" | "review" | "weak"): string {
  return band === "strong" ? "coerente" : band === "review" ? "media" : "bassa";
}
// Pillola di esito (sempre: la certificazione resta manuale, qui solo trasparenza).
const VERDICT_UI: Record<string, { bg: string; color: string; border: string; text: string }> = {
  strong: { bg: "rgba(127,174,150,0.12)", color: "var(--verified-c)", border: "rgba(127,174,150,0.4)", text: "Coerente, pronto per la certificazione" },
  review: { bg: "rgba(242,169,59,0.12)", color: "#F2A93B", border: "rgba(242,169,59,0.4)", text: "Somiglianza media: certifichiamo a mano" },
  weak: { bg: "rgba(238,122,112,0.12)", color: "var(--blocked-c)", border: "rgba(238,122,112,0.4)", text: "Somiglianza bassa: verifichiamo con attenzione" },
  inconclusive: { bg: "var(--elevated)", color: "var(--text-muted)", border: "var(--hairline)", text: "Verifichiamo a mano (volto non sempre leggibile)" },
};

const lbl: React.CSSProperties = { display: "block", color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: "0.5rem", letterSpacing: "0.04em" };
// NB: niente outline:"none" — l'anello di focus del browser deve restare
// visibile (a11y). Lo stile dei box resta il border; il focus aggiunge l'outline.
const inp: React.CSSProperties = { width: "100%", padding: "0.7rem 0.9rem", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--hairline-soft)", color: "var(--text)", fontSize: "0.9rem" };
