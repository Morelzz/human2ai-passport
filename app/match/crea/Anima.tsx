"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatEur } from "@/lib/wallet";
import { LIVELLI, MOVIMENTI, prezzoAnima, type Durata, type LivelloVideo } from "@/lib/engines/anima-prezzi";

type Fase = "chiusa" | "scheda" | "lavoro" | "pronto";

// ANIMA dentro Crea (mockup approvato il 19/9): lo scatto appena fatto diventa
// un video breve. Tre livelli (Rapido, Standard, Cinema), audio mai generato,
// serve il consenso al video della persona (lo dice il server: 403 no_video_consent).
export function Anima({ certificate, alias, immagine, conVolt, gruppo = false }: { certificate: string; alias: string; immagine: string; conVolt: boolean; gruppo?: boolean }) {
  const [fase, setFase] = useState<Fase>("chiusa");
  const [movimento, setMovimento] = useState<string>("respira");
  const [libero, setLibero] = useState("");
  const [secondi, setSecondi] = useState<Durata>(5);
  const [livello, setLivello] = useState<LivelloVideo>("standard");
  const [errore, setErrore] = useState<string | null>(null);
  const [manca, setManca] = useState<number | null>(null);
  const [video, setVideo] = useState<{ url: string; certificate?: string; secondi: number; somiglianza?: number; fotogrammi?: number } | null>(null);
  // Dove si trova il video: in fila, in lavorazione dal motore, o al controllo dei volti.
  const [passo, setPasso] = useState<"coda" | "lavoro" | "controllo">("coda");
  const [inizio, setInizio] = useState(0);
  const [adesso, setAdesso] = useState(0);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true; // React in sviluppo monta due volte: si riaccende qui
    return () => { vivo.current = false; };
  }, []);
  useEffect(() => {
    if (fase !== "lavoro") return;
    const t = setInterval(() => setAdesso(Date.now()), 1000);
    return () => clearInterval(t);
  }, [fase]);

  const prezzo = prezzoAnima(livello, secondi);
  const cifra = (c: number) => (conVolt ? `${c} ⚡` : formatEur(c));

  async function anima() {
    setErrore(null);
    setManca(null);
    const mov = libero.trim() || movimento;
    let res: Response, j: Record<string, unknown>;
    try {
      res = await fetch("/api/anima", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ certificate, movimento: mov, secondi, livello }) });
      j = await res.json();
    } catch {
      setErrore("Connessione persa, riprova.");
      return;
    }
    if (res.status === 402 && j.volt) { setManca(Number((j.volt as { missing: number }).missing)); return; }
    if (!res.ok) { setErrore(String(j.error ?? "Il video non è partito")); return; }
    const volt = j.volt as { balance: number | null } | undefined;
    if (volt?.balance != null) window.dispatchEvent(new CustomEvent("volt:update", { detail: { balance: volt.balance } }));
    const t0 = Date.now();
    setInizio(t0);
    setAdesso(t0);
    setFase("lavoro");
    setPasso("coda");
    const id = String(j.id);
    while (vivo.current && Date.now() - t0 < 15 * 60 * 1000) {
      await new Promise((r) => setTimeout(r, 5000));
      if (!vivo.current) return;
      let s: Record<string, unknown>;
      try { s = await (await fetch(`/api/anima/${id}`)).json(); } catch { continue; }
      if (s.status === "running" && (s.fase === "coda" || s.fase === "lavoro" || s.fase === "controllo")) setPasso(s.fase);
      if (s.status === "done" && s.video_url) {
        setVideo({
          url: String(s.video_url),
          certificate: s.certificate ? String(s.certificate) : undefined,
          secondi: Math.round((Date.now() - t0) / 1000),
          somiglianza: typeof s.identity_score === "number" ? s.identity_score : undefined,
          fotogrammi: typeof s.frames_checked === "number" ? s.frames_checked : undefined,
        });
        setFase("pronto");
        return;
      }
      if (s.status === "error") {
        window.dispatchEvent(new Event("volt:refetch"));
        setErrore(`${String(s.error ?? "Il video non è riuscito")} I VOLT sono tornati sul tuo saldo.`);
        setFase("scheda");
        return;
      }
    }
    if (vivo.current) { setErrore("Il video è ancora in lavorazione: lo trovi fra i tuoi contenuti appena è pronto."); setFase("scheda"); }
  }

  const secondiPassati = Math.max(0, Math.floor((adesso - inizio) / 1000));

  return (
    <>
      <button
        type="button"
        onClick={() => setFase("scheda")}
        data-theme="dark"
        className="mt-3 flex w-full items-center gap-4 rounded-[24px] bg-[var(--bg)] p-4 text-left text-foreground transition-opacity hover:opacity-95 sm:gap-5 sm:p-5"
      >
        <span className="relative h-[92px] w-[72px] shrink-0 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={immagine} alt="" className="h-full w-full object-cover" />
          <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(247,244,238,0.9)] text-[#17150F]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="text-[1.15rem] font-bold tracking-[-0.02em]">Anima questo scatto</span>
            <span className="rounded-full bg-amber px-2.5 py-0.5 text-[0.72rem] font-bold text-on-amber">Novità</span>
          </span>
          <span className="text-[0.9rem] leading-snug text-muted">Un video di 5 o 10 secondi che parte da questa foto. {gruppo ? "Stesse persone, consenso al video di ognuna, certificato come la foto." : "Stessa persona, consenso al video, certificato come la foto."}</span>
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E29A2E" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
      </button>

      {fase !== "chiusa" && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="anima-titolo">
          <button type="button" aria-label="Chiudi" onClick={() => fase !== "lavoro" && setFase("chiusa")} className="absolute inset-0 bg-[rgba(12,15,23,0.5)] backdrop-blur-[2px]" />
          <div className="relative grid max-h-[92vh] w-full max-w-[980px] overflow-y-auto rounded-t-[28px] bg-[var(--bg)] sm:grid-cols-[380px_1fr] sm:rounded-[28px]">
            {/* Anteprima: la foto e' il primo fotogramma, poi diventa il video */}
            <div data-theme="dark" className="relative hidden bg-[var(--bg)] sm:block">
              {fase === "pronto" && video ? (
                <video src={video.url} autoPlay loop muted playsInline controls className="h-full w-full object-cover" />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={immagine} alt="Primo fotogramma" className={`h-full w-full object-cover ${fase === "lavoro" ? "brightness-[0.6] blur-[6px]" : ""}`} />
                  {fase === "lavoro" && <span aria-hidden className="set-scan" />}
                  <span className="absolute left-4 top-4 rounded-full bg-[rgba(12,15,23,0.68)] px-3 py-1.5 text-[0.8rem] text-[#F2E9D8]">
                    {fase === "lavoro" ? `Sul set · ${String(Math.floor(secondiPassati / 60)).padStart(2, "0")}:${String(secondiPassati % 60).padStart(2, "0")}` : "Primo fotogramma"}
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-col p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="kicker">Anima</span>
                  <h2 id="anima-titolo" className="mt-2 text-[2rem] font-bold leading-none tracking-[-0.04em] sm:text-[2.4rem]">
                    {fase === "pronto" ? "Si muove." : fase === "lavoro" ? (passo === "controllo" ? "Ultimo controllo." : "Stiamo animando.") : "Dai vita allo scatto."}
                  </h2>
                </div>
                {fase !== "lavoro" && (
                  <button type="button" onClick={() => setFase("chiusa")} aria-label="Chiudi" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                )}
              </div>

              {fase === "scheda" && (
                <>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">Tu dici come {gruppo ? "si muovono" : "si muove"} {alias}, il resto lo fa il set. Senza audio: la voce di una persona non si genera mai.</p>
                  <p className="mt-5 text-[0.85rem] font-semibold text-muted">Come si muove</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MOVIMENTI.map((m) => (
                      <button key={m.v} type="button" onClick={() => { setMovimento(m.v); setLibero(""); }} aria-pressed={!libero && movimento === m.v}
                        className={`h-10 rounded-full border px-3.5 text-[0.9rem] ${!libero && movimento === m.v ? "border-foreground bg-foreground text-[var(--bg)]" : "border-border bg-surface"}`}>
                        {m.l}
                      </button>
                    ))}
                  </div>
                  <label htmlFor="mov-libero" className="sr-only">Oppure scrivilo tu</label>
                  <input id="mov-libero" value={libero} onChange={(e) => setLibero(e.target.value)} maxLength={400} placeholder="Oppure scrivilo tu: si sistema la giacca e ride"
                    className="mt-2.5 h-11 rounded-full border border-border bg-surface px-4 text-[16px] outline-none focus:border-amber/60" />

                  <p className="mt-5 text-[0.85rem] font-semibold text-muted">Durata</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {([5, 10] as Durata[]).map((d) => (
                      <button key={d} type="button" onClick={() => setSecondi(d)} aria-pressed={secondi === d}
                        className={`h-11 rounded-2xl bg-surface text-[0.95rem] font-semibold ${secondi === d ? "ring-2 ring-foreground" : "ring-1 ring-[var(--hairline)]"}`}>
                        {d} secondi
                      </button>
                    ))}
                  </div>

                  <p className="mt-5 text-[0.85rem] font-semibold text-muted">Livello</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {(Object.keys(LIVELLI) as LivelloVideo[]).map((v) => {
                      const p = prezzoAnima(v, secondi);
                      return (
                        <button key={v} type="button" onClick={() => setLivello(v)} aria-pressed={livello === v}
                          className={`flex flex-col gap-0.5 rounded-2xl bg-surface px-3.5 py-3 text-left ${livello === v ? "ring-2 ring-amber" : "ring-1 ring-[var(--hairline)]"}`}>
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-[0.95rem] font-semibold">{LIVELLI[v].l}</span>
                            <span className="text-[0.92rem] font-bold tabular-nums">{cifra(p.gross_cents)}</span>
                          </span>
                          <span className="text-[0.78rem] text-muted">{LIVELLI[v].desc}</span>
                          <span className="text-[0.78rem] text-verified">{formatEur(p.royalty_cents)} {gruppo ? "divisi fra" : "a"} {alias}</span>
                        </button>
                      );
                    })}
                  </div>

                  {errore && <p role="alert" className="mt-4 rounded-2xl bg-blocked-soft px-4 py-3 text-[0.9rem] text-on-blocked">{errore}</p>}
                  {manca !== null && (
                    <p className="mt-4 rounded-2xl bg-amber-soft px-4 py-3 text-[0.9rem]">
                      Ti mancano {manca} ⚡ per questo video. <Link href="/account/volt" className="font-semibold text-amber-ink underline">Ricarica</Link> o scegli un livello più leggero.
                    </p>
                  )}

                  <button type="button" onClick={anima}
                    className="mt-5 inline-flex h-[54px] items-center justify-center gap-2 self-stretch rounded-full bg-amber px-6 text-[1rem] font-bold text-on-amber transition-colors hover:bg-amber-hover sm:self-end">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                    Anima · {cifra(prezzo.gross_cents)}
                  </button>
                  <span className="mt-2 text-[0.8rem] text-muted sm:self-end">
                    {livello === "cinema" ? "Circa tre minuti" : "Circa un minuto o due"} · se qualcosa va storto i VOLT tornano indietro
                  </span>
                </>
              )}

              {fase === "lavoro" && (
                <div className="mt-4 flex flex-col gap-3">
                  <p className="text-[0.95rem] leading-relaxed text-muted">
                    {passo === "controllo"
                      ? "Video pronto. Ora lo controlliamo fotogramma per fotogramma: nessun volto protetto deve comparire, e le persone devono restare se stesse."
                      : `Il motore ${LIVELLI[livello].l} sta mettendo in movimento lo scatto di ${alias}. Puoi chiudere la pagina: il video ti aspetta fra i tuoi contenuti.`}
                  </p>
                  <ol className="flex flex-wrap gap-2 text-[0.82rem]" aria-label="Avanzamento">
                    {(["coda", "lavoro", "controllo"] as const).map((p, i) => {
                      const ordine = ["coda", "lavoro", "controllo"].indexOf(passo);
                      const stato = i < ordine ? "fatto" : i === ordine ? "ora" : "dopo";
                      return (
                        <li key={p} className={`rounded-full px-3 py-1 ${stato === "ora" ? "bg-amber text-on-amber font-semibold" : stato === "fatto" ? "bg-verified-soft text-on-verified" : "border border-border text-muted"}`}>
                          {p === "coda" ? "In fila" : p === "lavoro" ? "Il motore anima" : "Controllo dei volti"}
                        </li>
                      );
                    })}
                  </ol>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={immagine} alt="" className="h-64 w-full rounded-2xl object-cover brightness-[0.7] blur-[4px] sm:hidden" />
                </div>
              )}

              {fase === "pronto" && video && (
                <div className="mt-4 flex flex-col gap-4">
                  <video src={video.url} autoPlay loop muted playsInline controls className="w-full rounded-2xl sm:hidden" />
                  <p className="text-[0.95rem] text-muted">{alias} · {secondi} secondi · {LIVELLI[livello].l} · senza audio · pronto in {video.secondi} secondi</p>
                  <div className="flex flex-wrap gap-2">
                    {video.certificate && (
                      <span className="rounded-full bg-verified-soft px-3 py-1.5 text-[0.85rem] font-semibold text-on-verified">Video certificato {video.certificate.slice(0, 8)}</span>
                    )}
                    {video.somiglianza !== undefined && (
                      <span className="rounded-full border border-border px-3 py-1.5 text-[0.85rem] text-foreground" title="Misurata fotogramma per fotogramma con le foto verificate">
                        Somiglianza {video.somiglianza}%{video.fotogrammi ? ` · ${video.fotogrammi} fotogrammi controllati` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <a href={video.url} download={`semblic-anima-${(video.certificate ?? "").slice(0, 8)}.mp4`} className="inline-flex h-[52px] items-center rounded-full bg-amber px-6 font-bold text-on-amber">Scarica MP4</a>
                    <button type="button" onClick={() => { setVideo(null); setFase("scheda"); }} className="h-[52px] rounded-full border border-edge bg-surface px-5 font-semibold">Rifai il movimento</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
