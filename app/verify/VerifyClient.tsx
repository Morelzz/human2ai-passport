"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ──────────────────────────────────────────────────────────────────────────
// VERIFICATORE — il portale.
// Un solo gesto: carichi un'immagine. (a) Filigrana invisibile presente →
// "Generato da Semblic" con correlazione all'avatar e catena del consenso.
// (b) Nessuna filigrana → gate di consenso, poi face-search col registro
// (analisi sul dispositivo, al server solo un vettore) + filtri "restringi
// il cerchio" sui metadati auto-dichiarati. ONESTÀ: indizio, mai prova.
// Il percorso token resta SOLO come deep-link (?token= da feed/badge).
// ──────────────────────────────────────────────────────────────────────────

interface FaceCandidate {
  handle: string;
  alias: string;
  tier?: string | null;
  status?: string;
  similarity?: number;
  distance?: number;
}

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
  marked?: boolean;
  source?: "image" | "token";
  // /verify: la filigrana e' stata DAVVERO letta dai pixel? false = non l'abbiamo
  // potuta leggere (JPEG/screenshot non la conservano, o immagine troppo grande
  // per il server) → NON e' un verdetto, e l'analisi del volto va offerta lo stesso.
  wm_checked?: boolean;
  certificate?: string;
  // Esteso (esito "autorità"): consenso commerciale corrente + catena del consenso.
  commercial_consent?: boolean | null;
  has_portrait?: boolean;
  events?: Array<{ event_type: string; detail: string | null; occurred_at: string }>;
  face?: {
    scanned: boolean;
    face_found: boolean;
    match: boolean;
    protected?: boolean; // VETO 2.5: volto in sola protezione, identita' mai rivelata
    handle?: string;
    alias?: string;
    status?: string;
    revoked_at?: string | null;
    similarity?: number;
    avatars_checked?: number;
    filtered?: boolean;
    candidates?: FaceCandidate[];
    quality?: "ok" | "upscaled" | "low" | "no_face" | "error";
    detail?: string;
  };
}

// Vocabolario filtri = IDENTITY_KIT (whitelist speculare lato server).
const F_GENDERS = [{ v: "uomo", l: "Uomo" }, { v: "donna", l: "Donna" }];
// Etnia: pillole per GRUPPO (vocabolario IDENTITY_KIT del self-onboarding).
// I gruppi matchano sia gli avatar archiviati per gruppo sia quelli per
// nazionalità (espansione in ethnicityEq) — le nazionalità no.
const F_ETHNICITIES = ["Caucasica", "Afroamericana", "Asiatica", "Sud-asiatica", "Latina", "Mediorientale", "Africana", "Mista"];
const F_HAIRS = ["Neri", "Castani", "Biondi", "Rossi", "Grigi", "Rasati", "Calvo"];
const F_EYES = ["Marroni", "Neri", "Azzurri", "Verdi", "Grigi", "Nocciola"];
const F_HEIGHTS = [{ v: "bassa", l: "Bassa" }, { v: "media", l: "Media" }, { v: "alta", l: "Alta" }];
const F_BUILDS = [{ v: "slim", l: "Slim" }, { v: "atletico", l: "Atletica" }, { v: "normale", l: "Normale" }, { v: "curvy", l: "Curvy" }, { v: "robusto", l: "Robusta" }];

type Filters = Partial<Record<"gender" | "ethnicity" | "hair_color" | "eye_color" | "height" | "body_type", string>>;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

// Etichette della catena del consenso (stessi event_type del ledger).
const EVENT_LABELS: Record<string, { label: string; tone: "teal" | "amber" | "crimson" }> = {
  GRANTED: { label: "Consenso concesso", tone: "teal" },
  CATEGORY_ADDED: { label: "Categoria aggiunta", tone: "teal" },
  CATEGORY_REMOVED: { label: "Categoria rimossa", tone: "amber" },
  REVOKED: { label: "Consenso revocato", tone: "crimson" },
};

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`focus-ring rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold transition-colors ${
        active ? "border-teal/60 bg-teal/15 text-teal" : "border-border text-faint hover:border-edge hover:text-muted"
      }`}
    >
      {children}
    </button>
  );
}

export default function VerifyClient({ initialToken = "" }: { initialToken?: string }) {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // Gate di consenso: il file in attesa che l'utente autorizzi l'analisi volto.
  const [pendingFace, setPendingFace] = useState<File | null>(null);
  // Descrittore in memoria SOLO per ri-filtrare (mai persistito da nessuna parte).
  const descriptorRef = useRef<number[] | null>(null);
  const qualityRef = useRef<"ok" | "upscaled" | null>(null);
  // Generation counter: una risposta face-search STALE (filtro in volo mentre
  // arriva una nuova immagine) non deve MAI innestarsi nel risultato nuovo —
  // sarebbe nominare la persona sbagliata sotto l'immagine sbagliata.
  const searchGen = useRef(0);
  const [filters, setFilters] = useState<Filters>({});
  const [filtering, setFiltering] = useState(false);

  // Deep-link ?token=<cert> (feed, badge, segnalazioni): verifica subito.
  const autoRan = useRef(false);
  useEffect(() => {
    if (initialToken && !autoRan.current) {
      autoRan.current = true;
      (async () => {
        setBusy(true);
        try {
          const res = await fetch(`/api/verify?token=${encodeURIComponent(initialToken.trim())}`);
          setResult({ ...(await res.json()), source: "token" });
        } catch {
          setResult({ valid: false, source: "token" });
        }
        setBusy(false);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    searchGen.current++;
    setResult(null);
    setPendingFace(null);
    setFilters({});
    descriptorRef.current = null;
    qualityRef.current = null;
  }

  async function onFile(file: File) {
    if (busy || filtering || !file.type.startsWith("image/")) return;
    reset();
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setBusy(true);

    // (1) Filigrana invisibile: vive nei LSB di un PNG lossless. Un JPEG o uno
    //     screenshot NON puo' contenerla. Vercel rifiuta i body oltre ~4,5MB
    //     (le foto da fotocamera arrivano a 15-20MB → 413): per i PNG GRANDI
    //     leggiamo la filigrana SUL DISPOSITIVO, a risoluzione nativa (mai
    //     ridimensionati: il resize la distruggerebbe), e al server mandiamo
    //     solo il certificato. wm_checked dice se i pixel sono stati letti davvero.
    const WM_MAX_BYTES = 4.4 * 1024 * 1024; // margine sotto il cap di Vercel
    const isPng = file.type === "image/png";
    let certified = false;
    const applyLookup = (data: VerifyResult) => {
      setResult({ ...data, source: "image", wm_checked: true });
      certified = Boolean(data.valid || data.marked);
    };

    if (isPng && file.size <= WM_MAX_BYTES) {
      // PNG piccolo: legge il server (sharp = riferimento esatto dei pixel).
      setStage("Leggo la filigrana invisibile…");
      try {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/verify-image", { method: "POST", body: fd });
        if (res.ok) applyLookup(await res.json());
        // 413/5xx: filigrana non leggibile, MA non e' un verdetto sull'immagine.
        else setResult({ valid: false, source: "image", wm_checked: false });
      } catch {
        setResult({ valid: false, source: "image", wm_checked: false });
      }
    } else if (isPng) {
      // PNG GRANDE: niente upload (sarebbe un 413). Leggo la filigrana qui e
      // mando al server solo il certificato (payload minuscolo).
      setStage("Leggo la filigrana sul tuo dispositivo…");
      try {
        const { readWatermarkFromFile } = await import("@/lib/stegano-browser");
        const cert = await readWatermarkFromFile(file);
        if (cert) {
          const res = await fetch("/api/verify-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ certificate: cert }),
          });
          if (res.ok) {
            const data = await res.json();
            // La filigrana l'abbiamo letta NOI sul dispositivo: "marcata" è verità
            // del client (il server, che non ha visto i pixel, torna marked:false se
            // il cert è sconosciuto). Esito onesto: certificato (valid) oppure
            // "filigrana trovata, certificato sconosciuto".
            setResult({ ...data, source: "image", wm_checked: true, marked: true });
            certified = true; // un watermark c'è: non si passa all'analisi del volto
          } else {
            setResult({ valid: false, source: "image", wm_checked: false });
          }
        } else {
          // Pixel letti davvero: nessuna filigrana → wm_checked TRUE (esito onesto).
          setResult({ valid: false, source: "image", wm_checked: true });
        }
      } catch {
        // Lettura on-device non riuscita (memoria/canvas): non e' un verdetto.
        setResult({ valid: false, source: "image", wm_checked: false });
      }
    } else {
      // JPEG/screenshot/altro: non puo' contenere la filigrana invisibile.
      setResult({ valid: false, source: "image", wm_checked: false });
    }

    // (2) Se non e' un contenuto certificato SEMBLIC, offri SEMPRE l'analisi del
    //     volto: e' sul dispositivo, indipendente dall'upload, ed e' la tutela
    //     della persona. Non deve morire se la filigrana non si e' potuta leggere.
    //     Il descrittore e' dato biometrico → parte solo dopo il consenso esplicito.
    if (!certified) setPendingFace(file);

    setStage(null);
    setBusy(false);
  }

  // L'utente ha acconsentito: quality gate sul dispositivo, poi confronto.
  async function onFaceConsent() {
    if (!pendingFace || busy) return;
    setBusy(true);
    setStage("Analizzo il volto sul tuo dispositivo… (la prima analisi scarica i modelli: anche 30s)");
    try {
      const { analyzeFaceForVerify } = await import("@/lib/face-match");
      const analysis = await analyzeFaceForVerify(pendingFace);
      if (!analysis.descriptor || analysis.quality === "no_face" || analysis.quality === "low" || analysis.quality === "error") {
        setResult((prev) => prev ? {
          ...prev,
          face: {
            scanned: analysis.quality !== "error",
            face_found: analysis.quality !== "no_face" && analysis.quality !== "error",
            match: false,
            quality: analysis.quality,
            detail: analysis.detail,
          },
        } : prev);
      } else {
        descriptorRef.current = analysis.descriptor;
        qualityRef.current = analysis.quality;
        setStage("Confronto col registro…");
        await runFaceSearch(analysis.descriptor, {});
      }
    } catch {
      setResult((prev) => prev ? { ...prev, face: { scanned: false, face_found: false, match: false } } : prev);
    }
    setPendingFace(null);
    setStage(null);
    setBusy(false);
  }

  // Confronto col registro (al server SOLO il vettore + eventuali filtri).
  async function runFaceSearch(descriptor: number[], f: Filters) {
    const gen = searchGen.current;
    try {
      const res = await fetch("/api/verify-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor, filters: f }),
      });
      const data = res.ok ? await res.json() : { match: false, scanned: false };
      if (gen !== searchGen.current) return; // risposta stale: scartata
      setResult((prev) => prev ? {
        ...prev,
        face: {
          ...data,
          scanned: Boolean(data.scanned),
          face_found: true,
          match: Boolean(data.match),
          quality: qualityRef.current ?? "ok",
        },
      } : prev);
    } catch {
      if (gen !== searchGen.current) return; // risposta stale: scartata
      setResult((prev) => prev ? { ...prev, face: { scanned: false, face_found: true, match: false } } : prev);
    }
  }

  // Filtri "restringi il cerchio": ogni tocco ri-esegue il confronto.
  async function toggleFilter(key: keyof Filters, value: string) {
    if (!descriptorRef.current || filtering) return;
    const next: Filters = { ...filters, [key]: filters[key] === value ? undefined : value };
    for (const k of Object.keys(next) as Array<keyof Filters>) if (!next[k]) delete next[k];
    setFilters(next);
    setFiltering(true);
    await runFaceSearch(descriptorRef.current, next);
    setFiltering(false);
  }

  // Stato visivo del portale (il colore funzionale parla prima del testo).
  const portalState = busy ? "busy"
    : dragOver ? "drag"
    : result ? (result.valid ? "ok" : "warn")
    : "idle";
  const ringClass = {
    idle: "border-border",
    drag: "border-teal/70 bg-teal/5",
    busy: "border-violet/40",
    ok: "border-teal/60",
    warn: "border-crimson/50",
  }[portalState];

  const face = result?.face;
  const showFilters = face && face.scanned && face.face_found && face.quality !== "low" && face.quality !== "no_face" && descriptorRef.current;

  return (
    <div>
      {/* ── IL PORTALE ─────────────────────────────────────────────────── */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        className="flex flex-col items-center"
      >
        <label
          data-state={portalState}
          className={`relative flex h-60 w-60 cursor-pointer items-center justify-center overflow-hidden rounded-[28px] border bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_50px_-22px_rgba(0,0,0,0.9)] transition-all duration-300 focus-within:ring-2 focus-within:ring-violet-light focus-within:ring-offset-2 focus-within:ring-offset-black sm:h-72 sm:w-72 ${ringClass} ${busy ? "cursor-wait" : ""} ${dragOver ? "scale-[1.02]" : ""}`}
        >
          {/* Aura di verifica (solo a riposo: su un'immagine caricata la toglie per non tingerla) */}
          {!preview && (
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 55% at 50% 42%, rgba(127,174,150,0.12), transparent 62%)" }} />
          )}
          {/* Cornice a mirino (scanner): l'identita di Sigil = verifica (salvia) */}
          <span aria-hidden className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 rounded-tl-lg border-l-[1.5px] border-t-[1.5px] border-teal/50" />
          <span aria-hidden className="pointer-events-none absolute right-3.5 top-3.5 h-5 w-5 rounded-tr-lg border-r-[1.5px] border-t-[1.5px] border-teal/50" />
          <span aria-hidden className="pointer-events-none absolute bottom-3.5 left-3.5 h-5 w-5 rounded-bl-lg border-b-[1.5px] border-l-[1.5px] border-teal/50" />
          <span aria-hidden className="pointer-events-none absolute bottom-3.5 right-3.5 h-5 w-5 rounded-br-lg border-b-[1.5px] border-r-[1.5px] border-teal/50" />
          {preview ? (
            // L'immagine si SCALA dentro al portale: soggetto sempre intero, mai tagliato.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className={`h-full w-full object-contain p-2 transition-opacity ${busy ? "opacity-40" : "opacity-90"}`} />
          ) : (
            <span className="px-8 text-center text-[0.8rem] leading-relaxed text-faint">
              <span aria-hidden className="mb-2 block text-4xl font-extralight text-muted">⌖</span>
              Trascina qui un&apos;immagine
              <span className="block text-[0.7rem]">o tocca per sceglierla</span>
            </span>
          )}
          {busy && (
            <span aria-hidden className="absolute inset-2 animate-spin rounded-full border-2 border-violet-light border-t-transparent opacity-80" />
          )}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            aria-label={preview ? "Carica un'altra immagine da verificare" : "Carica un'immagine da verificare"}
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }}
          />
        </label>
        <p aria-live="polite" className="mt-3 h-5 text-center text-[0.75rem] text-violet-light">{stage ?? ""}</p>
        <p className="max-w-md text-center text-[0.68rem] leading-relaxed text-faint">
          Per leggere la filigrana l&apos;immagine <span className="text-muted">può essere inviata al server</span>
          (elaborata al volo, mai salvata); i file grandi vengono letti direttamente
          <span className="text-muted"> sul tuo dispositivo</span>. L&apos;analisi del volto avviene comunque tutta
          sul tuo dispositivo: al server arriva solo un vettore numerico, mai conservato.
          La filigrana sopravvive ai PNG scaricati da Semblic; screenshot e ricompressioni possono cancellarla.
        </p>
      </div>

      {/* ── ESITO ──────────────────────────────────────────────────────── */}
      {/* Live region SEMPRE montata: l'esito viene annunciato agli screen reader. */}
      <div role="status">
      {result && (
        <div className={`mt-6 rounded-3xl border p-6 ${result.valid ? "border-teal/30 bg-teal/[0.04]" : result.marked ? "border-amber/30 bg-amber/[0.04]" : "border-crimson/25 bg-crimson/[0.03]"}`}>
          {result.valid ? (
            <>
              {/* Sigillo + verdetto: emesso, non constatato */}
              <div className="mb-5 flex items-center gap-4">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
                  <circle cx="22" cy="22" r="20" stroke="var(--verified-c)" strokeWidth="1.5" pathLength="100" strokeDasharray="100" strokeDashoffset="100" strokeLinecap="round">
                    <animate attributeName="stroke-dashoffset" from="100" to="0" dur="0.7s" fill="freeze" />
                  </circle>
                  <path d="M14 22.5l5.5 5.5L30 16.5" stroke="var(--verified-c)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength="100" strokeDasharray="100" strokeDashoffset="100">
                    <animate attributeName="stroke-dashoffset" from="100" to="0" dur="0.45s" begin="0.55s" fill="freeze" />
                  </path>
                </svg>
                <div>
                  <h2 className="m-0 font-mono text-[0.95rem] font-bold tracking-wide text-teal">
                    {result.type === "content" ? "GENERATO DA SEMBLIC" : "TOKEN VALIDO"}
                  </h2>
                  <p className="m-0 text-[0.8rem] text-muted">
                    {result.type === "content"
                      ? "Contenuto certificato: dietro c'è una persona reale, consenziente e pagata."
                      : "Consenso verificato nel registro Semblic."}
                  </p>
                </div>
              </div>

              {/* Correlazione visiva: contenuto ↔ persona del registro */}
              {result.type === "content" && result.handle && (
                <div className="mb-5 flex items-center gap-4 rounded-2xl border border-border bg-obsidian p-4">
                  {preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  )}
                  <span aria-hidden className="text-lg text-teal">⇄</span>
                  <div className="flex items-center gap-3">
                    {result.has_portrait ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/sample/${result.handle}/0`} alt={result.alias ?? ""} className="h-16 w-16 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-violet/15 text-xl font-bold text-violet-light">
                        {(result.alias ?? "?").charAt(0)}
                      </span>
                    )}
                    <div>
                      <p className="m-0 font-semibold text-foreground">{result.alias}</p>
                      <p className="m-0 text-[0.8rem] text-faint">@{result.handle}</p>
                      {result.status === "ATTIVO"
                        ? <span className="text-[0.72rem] font-bold text-teal">● CONSENSO ATTIVO</span>
                        : <span className="text-[0.72rem] font-bold text-crimson">✕ CONSENSO REVOCATO</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Dettagli */}
              <div className="grid grid-cols-2 gap-4">
                {result.type !== "content" && (
                  <div>
                    <p className="mb-0.5 text-[0.7rem] tracking-[0.08em] text-faint">AVATAR</p>
                    <p className="m-0 font-semibold text-foreground">{result.alias}</p>
                    <p className="m-0 text-[0.8rem] text-faint">@{result.handle}</p>
                  </div>
                )}
                {result.type === "content" && (
                  <div>
                    <p className="mb-0.5 text-[0.7rem] tracking-[0.08em] text-faint">GENERATO IL</p>
                    <p className="m-0 font-semibold text-foreground">{result.generated_at ? formatDate(result.generated_at) : "—"}</p>
                  </div>
                )}
                <div>
                  <p className="mb-0.5 text-[0.7rem] tracking-[0.08em] text-faint">CATEGORIA D&apos;USO</p>
                  <p className="m-0 font-semibold text-foreground">{result.category ?? "—"}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[0.7rem] tracking-[0.08em] text-faint">AUTORIZZATO DAL</p>
                  <p className="m-0 font-semibold text-foreground">{result.consent_start ? formatDate(result.consent_start) : "—"}</p>
                </div>
                {result.revoked_at && (
                  <div>
                    <p className="mb-0.5 text-[0.7rem] tracking-[0.08em] text-faint">REVOCATO DAL</p>
                    <p className="m-0 font-semibold text-crimson">{formatDate(result.revoked_at)}</p>
                  </div>
                )}
              </div>

              {/* Check di coerenza: consenso commerciale ATTUALE della persona */}
              {result.type === "content" && typeof result.commercial_consent === "boolean" && (
                result.commercial_consent ? (
                  <p className="mt-4 rounded-xl border border-teal/25 bg-teal/5 p-3 text-[0.78rem] leading-relaxed text-teal">
                    ✓ La persona consente l&apos;uso commerciale del proprio volto. La concessione valeva al momento della generazione.
                  </p>
                ) : (
                  <p className="mt-4 rounded-xl border border-crimson/25 bg-crimson/5 p-3 text-[0.78rem] leading-relaxed text-crimson">
                    ✗ Oggi la persona non consente più l&apos;uso commerciale: usi futuri sono bloccati. La concessione valeva al momento della generazione.
                  </p>
                )
              )}

              {/* Catena del consenso */}
              {result.events && result.events.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-[0.7rem] tracking-[0.08em] text-faint">CATENA DEL CONSENSO</p>
                  <div className="flex flex-col gap-1.5 border-l border-border pl-4">
                    {result.events.slice(-6).map((ev, i) => {
                      const meta = EVENT_LABELS[ev.event_type] ?? { label: ev.event_type, tone: "teal" as const };
                      const color = meta.tone === "crimson" ? "text-crimson" : meta.tone === "amber" ? "text-amber" : "text-teal";
                      return (
                        <p key={i} className="m-0 text-[0.75rem] leading-relaxed text-muted">
                          <span className={`font-semibold ${color}`}>{meta.label}</span>
                          {ev.detail ? <span className="text-faint"> · {ev.detail}</span> : null}
                          <span className="font-mono text-[0.68rem] text-faint"> · {formatDate(ev.occurred_at)}</span>
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}

              {result.type === "content" && result.status === "REVOCATO" && (
                <p className="mt-4 rounded-xl border border-crimson/25 bg-crimson/5 p-3 text-[0.78rem] leading-relaxed text-crimson">
                  Il consenso è stato revocato <strong>dopo</strong> questa generazione. La revoca è prospettica:
                  blocca gli usi futuri, mentre questo contenuto resta tracciato e attribuito.
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href={`/passport/${result.handle}`} className="rounded-full border border-violet/40 px-4 py-1.5 text-[0.82rem] font-semibold text-violet-light transition-colors hover:bg-violet/10">
                  Vai al Passport →
                </Link>
                <Link
                  href={result.type === "content"
                    ? `/report?cert=${encodeURIComponent(result.certificate ?? "")}`
                    : `/report?handle=${encodeURIComponent(result.handle ?? "")}`}
                  className="text-[0.8rem] text-faint underline-offset-2 hover:underline"
                >
                  Segnala abuso
                </Link>
              </div>
            </>
          ) : pendingFace && !face ? (
            /* ── GATE DI CONSENSO: il confronto biometrico non parte da solo ──
               (si arriva qui SOLO senza filigrana: il caso marked ha il suo stato) */
            <>
              <h2 className="m-0 font-mono text-[0.95rem] font-bold tracking-wide text-crimson">{result.wm_checked ? "NESSUNA FILIGRANA TROVATA" : "FILIGRANA NON VERIFICATA"}</h2>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">
                {result.wm_checked
                  ? "Questa immagine non porta la filigrana Semblic (o è stata rimossa da screenshot/ricompressione)."
                  : "La filigrana invisibile vive solo nei PNG originali scaricati da Semblic: un JPEG, uno screenshot o un'immagine molto grande non la conservano. Posso comunque confrontare il volto con il registro."}
              </p>
              <div className="mt-4 rounded-2xl border border-border bg-obsidian p-4">
                <p className="m-0 text-[0.85rem] font-semibold text-foreground">
                  Vuoi confrontare il volto con il registro?
                </p>
                <ul className="my-2 list-none space-y-1 p-0 text-[0.75rem] leading-relaxed text-faint">
                  <li>· L&apos;analisi del volto avviene <span className="text-muted">sul tuo dispositivo</span>: per questo confronto l&apos;immagine non viene inviata di nuovo al server.</li>
                  <li>· Al server viaggia solo un vettore numerico, <span className="text-muted">mai conservato</span>.</li>
                  <li>· L&apos;esito è un <span className="text-muted">indizio per la tutela del titolare</span>, mai una prova.</li>
                </ul>
                <button
                  type="button"
                  onClick={onFaceConsent}
                  disabled={busy}
                  className="focus-ring mt-1 rounded-full bg-[#F2A93B] px-5 py-2 text-[0.82rem] font-bold text-[#412402] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Acconsento all&apos;analisi del volto
                </button>
              </div>
            </>
          ) : face?.quality === "error" ? (
            /* ── ERRORE TECNICO: distinto da "nessun volto" (mai confonderli) ── */
            <>
              <h2 className="m-0 font-mono text-[0.95rem] font-bold tracking-wide text-amber">ANALISI NON RIUSCITA SUL TUO DISPOSITIVO</h2>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">
                Non è un verdetto sull&apos;immagine: l&apos;analisi del volto si è interrotta per un problema
                tecnico del browser (memoria/GPU). Ricarica la pagina e riprova; se persiste, prova da un altro browser.
              </p>
              {face.detail && (
                <p className="mt-2 font-mono text-[0.65rem] text-faint">dettaglio tecnico: {face.detail}</p>
              )}
            </>
          ) : face?.quality === "low" ? (
            /* ── QUALITY GATE: meglio nessuna risposta che una inventata ── */
            <>
              <h2 className="m-0 font-mono text-[0.95rem] font-bold tracking-wide text-amber">QUALITÀ INSUFFICIENTE PER UN CONFRONTO AFFIDABILE</h2>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">
                Il volto in questa immagine è troppo piccolo o sfocato: una percentuale calcolata su pixel
                che non contengono l&apos;informazione sarebbe un&apos;invenzione.
              </p>
              <p className="mt-3 rounded-xl border border-border bg-white/[0.03] p-3 text-[0.78rem] leading-relaxed text-muted">
                Non &laquo;miglioriamo&raquo; la foto con l&apos;AI inventando un volto: l&apos;identità è il prodotto,
                o c&apos;è, o non ci pronunciamo. Se puoi, carica il <span className="text-foreground">file originale</span> (non uno screenshot).
              </p>
            </>
          ) : face?.protected ? (
            /* ── VOLTO PROTETTO (VETO): non riveliamo MAI chi e' ── */
            <>
              <div className="mb-4 flex items-start gap-3">
                <span aria-hidden className="mt-1 h-3 w-3 shrink-0 rounded-full bg-violet" />
                <div>
                  <h2 className="m-0 font-mono text-[0.95rem] font-bold tracking-wide text-violet-light">VOLTO PROTETTO: GENERAZIONE VIETATA</h2>
                  <p className="m-0 text-[0.8rem] text-muted">Questa persona si &egrave; registrata per NON essere generata.</p>
                </div>
              </div>
              <p className="rounded-xl border border-violet/20 bg-violet/[0.06] p-3 text-[0.8rem] leading-relaxed text-muted">
                Per tutela non riveliamo di chi si tratta. Il titolare del volto &egrave; stato avvisato: sar&agrave; lui,
                se vorr&agrave;, a procedere. Dentro Semblic questo volto non &egrave; generabile; fuori restano allerta precoce e rimozione assistita.
              </p>
              <p className="mt-2 text-[0.66rem] text-faint">In revisione legale.</p>
            </>
          ) : face?.match ? (
            /* ── VOLTO RICONOSCIUTO (contenuto non certificato) ── */
            <>
              <div className="mb-4 flex items-start gap-3">
                <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crimson/15 text-crimson">⚠</span>
                <div>
                  <h2 className="m-0 font-mono text-[0.95rem] font-bold tracking-wide text-crimson">CONTENUTO NON CERTIFICATO: VOLTO RICONOSCIUTO</h2>
                  <p className="m-0 text-[0.8rem] text-muted">Nessuna filigrana Semblic, ma il volto corrisponde a una persona del registro.</p>
                </div>
              </div>

              {face.quality === "upscaled" && (
                <p className="mb-3 text-[0.7rem] text-faint">
                  Immagine adattata per l&apos;analisi (upscale conservativo: nessun dettaglio inventato).
                </p>
              )}

              {/* Candidati: barre hairline, ~% sempre, primo evidenziato */}
              <div className="flex flex-col gap-2">
                {(face.candidates ?? []).map((c, i) => (
                  <div key={c.handle} className={`select-none rounded-xl border p-3 ${i === 0 ? "border-crimson/30 bg-crimson/[0.04]" : "border-border"}`}>
                    <div className="flex cursor-default items-baseline justify-between gap-3">
                      <p className="m-0 text-[0.85rem] font-semibold text-foreground">
                        {c.alias} <span className="font-normal text-faint">@{c.handle}</span>
                        {c.status === "REVOCATO" && <span className="ml-2 text-[0.68rem] font-bold text-crimson">REVOCATO</span>}
                      </p>
                      <p className="m-0 font-mono text-[0.8rem] font-bold text-foreground">~{c.similarity}%</p>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-crimson/70 transition-all duration-500" style={{ width: `${Math.min(100, c.similarity ?? 0)}%` }} />
                    </div>
                    {i === 0 && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <Link href={`/report?handle=${encodeURIComponent(c.handle)}`} className="rounded-full bg-crimson px-3.5 py-1.5 text-[0.75rem] font-bold text-white transition-opacity hover:opacity-90">
                          Segnala questo contenuto →
                        </Link>
                        <Link href={`/passport/${c.handle}`} className="rounded-full border border-violet/40 px-3.5 py-1.5 text-[0.75rem] font-semibold text-violet-light transition-colors hover:bg-violet/10">
                          Passport
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="mt-3 rounded-xl border border-crimson/20 bg-crimson/5 p-3 text-[0.76rem] leading-relaxed text-crimson/90">
                Ogni contenuto autorizzato da Semblic porta la filigrana col certificato. Questa immagine non la porta:
                con ogni probabilità è stata generata <strong>fuori</strong> da Semblic, senza il consenso della persona.
              </p>
            </>
          ) : face && face.scanned && !face.face_found ? (
            <>
              <h2 className="m-0 font-mono text-[0.95rem] font-bold tracking-wide text-crimson">NESSUN VOLTO ANALIZZABILE</h2>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">Nell&apos;immagine non è stato rilevato un volto su cui eseguire il confronto.</p>
              {face.detail && (
                <p className="mt-2 font-mono text-[0.65rem] text-faint">dettaglio tecnico: {face.detail}</p>
              )}
            </>
          ) : face && face.scanned ? (
            <>
              <h2 className="m-0 font-mono text-[0.95rem] font-bold tracking-wide text-foreground">NESSUNA CORRISPONDENZA</h2>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">
                {face.filtered
                  ? <>Nel cerchio ristretto dai filtri ({face.avatars_checked ?? 0} avatar compatibili) nessun volto corrisponde sopra la soglia.</>
                  : <>Il volto non corrisponde a nessuna persona del registro ({face.avatars_checked ?? 0} avatar confrontati).</>}
              </p>
            </>
          ) : face && !face.scanned ? (
            <>
              <h2 className="m-0 font-mono text-[0.95rem] font-bold tracking-wide text-muted">ANALISI NON DISPONIBILE</h2>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">L&apos;analisi del volto non è al momento disponibile. La verifica della filigrana resta valida: nessuna filigrana trovata.</p>
            </>
          ) : (
            <>
              <h2 className={`m-0 font-mono text-[0.95rem] font-bold tracking-wide ${result.marked ? "text-amber" : "text-crimson"}`}>
                {result.source === "token" ? "NON VALIDO" : result.marked ? "FILIGRANA TROVATA: CERTIFICATO SCONOSCIUTO" : "NESSUNA FILIGRANA"}
              </h2>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">
                {result.source === "token"
                  ? "Questo codice non corrisponde a nessun avatar né contenuto nel registro."
                  : result.marked
                    ? "L'immagine porta una filigrana Semblic, ma il certificato non risulta nel registro: segnalacelo."
                    : "Nessuna filigrana Semblic in questa immagine."}
              </p>
            </>
          )}

          {/* ── RESTRINGI IL CERCHIO (solo dopo un'analisi volto riuscita) ── */}
          {showFilters && (
            <div className="mt-5 rounded-2xl border border-border bg-obsidian p-4">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <p className="m-0 text-[0.7rem] font-bold tracking-[0.1em] text-faint">RESTRINGI IL CERCHIO</p>
                <p className="m-0 text-[0.7rem] text-faint" aria-live="polite">
                  {filtering ? "confronto…" : <>confronto con <span className="font-bold text-muted">{face?.avatars_checked ?? 0}</span> avatar compatibili</>}
                </p>
              </div>
              <p className="mb-3 mt-0 text-[0.72rem] leading-relaxed text-faint">
                Conosci caratteristiche della persona? I filtri stringono il confronto ai soli avatar
                con quei metadati <span className="text-muted">auto-dichiarati</span>. La soglia biometrica non cambia mai.
              </p>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="mb-1.5 mt-0 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-faint">Genere</p>
                  <div className="flex flex-wrap gap-1.5">
                    {F_GENDERS.map((g) => <FilterPill key={g.v} active={filters.gender === g.v} onClick={() => toggleFilter("gender", g.v)}>{g.l}</FilterPill>)}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 mt-0 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-faint">Etnia</p>
                  <div className="flex flex-wrap gap-1.5">
                    {F_ETHNICITIES.map((e) => <FilterPill key={e} active={filters.ethnicity === e.toLowerCase()} onClick={() => toggleFilter("ethnicity", e.toLowerCase())}>{e}</FilterPill>)}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 mt-0 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-faint">Capelli</p>
                  <div className="flex flex-wrap gap-1.5">
                    {F_HAIRS.map((h) => <FilterPill key={h} active={filters.hair_color === h.toLowerCase()} onClick={() => toggleFilter("hair_color", h.toLowerCase())}>{h}</FilterPill>)}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 mt-0 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-faint">Occhi</p>
                  <div className="flex flex-wrap gap-1.5">
                    {F_EYES.map((o) => <FilterPill key={o} active={filters.eye_color === o.toLowerCase()} onClick={() => toggleFilter("eye_color", o.toLowerCase())}>{o}</FilterPill>)}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 mt-0 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-faint">Statura</p>
                  <div className="flex flex-wrap gap-1.5">
                    {F_HEIGHTS.map((h) => <FilterPill key={h.v} active={filters.height === h.v} onClick={() => toggleFilter("height", h.v)}>{h.l}</FilterPill>)}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 mt-0 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-faint">Corporatura</p>
                  <div className="flex flex-wrap gap-1.5">
                    {F_BUILDS.map((b) => <FilterPill key={b.v} active={filters.body_type === b.v} onClick={() => toggleFilter("body_type", b.v)}>{b.l}</FilterPill>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer fisso sotto ogni esito biometrico */}
          {face && face.scanned && (
            <p className="mt-4 text-[0.68rem] leading-relaxed text-faint">
              Il riconoscimento del volto è calcolato sul tuo dispositivo ed è un <span className="text-muted">indizio</span>,
              mai una prova: la prova di autorizzazione è la filigrana col certificato. Anche con un solo
              candidato compatibile, il verdetto resta un indizio forte, non un&apos;identificazione certa.
            </p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
