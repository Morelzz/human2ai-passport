"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SCENE } from "@/lib/prova-gratis";

// LA FASCIA "PROVALO ADESSO". Un'isola scura dentro la pagina chiara: scegli
// una persona, scegli una scena, guarda. Niente account, niente carta.
// La foto esce con la filigrana: pulita si scarica solo dall'account.

export interface VoltoProva {
  handle: string;
  alias: string;
  src: string;
}

interface Esito {
  certificato: string;
  immagine: string;
  alias: string | null;
  handle: string;
  consenso_dal: string | null;
  somiglianza: number | null;
  pagato_cent: number | null;
}

export function ProvaGratis({ volti, compatta = false }: { volti: VoltoProva[]; compatta?: boolean }) {
  const [volto, setVolto] = useState(volti[0]?.handle ?? "");
  const [scena, setScena] = useState(SCENE[0].v);
  const [stato, setStato] = useState<"fermo" | "lavoro" | "fatto" | "errore">("fermo");
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [esito, setEsito] = useState<Esito | null>(null);
  const [secondi, setSecondi] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function genera() {
    setStato("lavoro");
    setMessaggio(null);
    setSecondi(0);
    const t0 = Date.now();
    timer.current = setInterval(() => setSecondi(Math.round((Date.now() - t0) / 1000)), 1000);
    try {
      const r = await fetch("/api/prova", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: volto, scena }),
      });
      const j = await r.json();
      if (!r.ok || !j.jobId) throw new Error(j.error ?? "Non è partita, riprova.");

      // Si aspetta il set: due minuti al massimo, poi si molla con garbo.
      for (let i = 0; i < 60; i++) {
        await new Promise((x) => setTimeout(x, 3000));
        const s = await (await fetch(`/api/prova/${j.jobId}`)).json();
        if (s.stato === "done") {
          setEsito(s as Esito);
          setStato("fatto");
          return;
        }
        if (s.stato === "error") throw new Error(s.errore ?? "Il set si è fermato. Riprova.");
      }
      throw new Error("Il set ci sta mettendo troppo. Riprova fra poco.");
    } catch (e) {
      setMessaggio(e instanceof Error ? e.message : "Non è partita, riprova.");
      setStato("errore");
    } finally {
      if (timer.current) clearInterval(timer.current);
    }
  }

  if (!volti.length) return null;

  return (
    <section data-theme="dark" className="isola mx-auto max-w-7xl p-6 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_92%_-10%,rgba(226,154,46,0.18),transparent_62%)]" />
      <div className="relative">
        {stato !== "fatto" ? (
          <>
            <span className="kicker text-amber">PROVALO ADESSO</span>
            <h2 className={`mt-2.5 text-balance font-bold leading-[1.06] tracking-[-0.04em] ${compatta ? "text-[1.8rem] sm:text-[2.2rem]" : "text-[2.1rem] sm:text-[2.9rem]"}`}>
              Non devi crederci. Guardalo.
            </h2>
            <p className="mt-2.5 max-w-[58ch] text-pretty text-[0.98rem] leading-relaxed text-muted">
              Scegli una persona vera del registro e una scena. In meno di un minuto hai la tua foto, con il certificato
              che dice chi c&apos;è dentro e cosa ha autorizzato. Niente account, niente carta.
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-start">
              <div>
                <span className="kicker text-amber">1 · LA PERSONA</span>
                <div className="senza-barra mt-3 flex gap-2.5 overflow-x-auto pb-1">
                  {volti.map((v) => (
                    <button
                      key={v.handle}
                      type="button"
                      onClick={() => setVolto(v.handle)}
                      aria-pressed={v.handle === volto}
                      disabled={stato === "lavoro"}
                      className="focus-ring w-[66px] shrink-0 text-center disabled:opacity-60"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.src}
                        alt={v.alias}
                        loading="lazy"
                        className={`h-[84px] w-[66px] rounded-xl border-2 object-cover transition-colors ${v.handle === volto ? "border-amber" : "border-transparent opacity-80"}`}
                      />
                      <span className="mt-1.5 block truncate text-[0.72rem] text-muted">{v.alias}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="kicker text-amber">2 · LA SCENA</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SCENE.map((s) => (
                    <button
                      key={s.v}
                      type="button"
                      onClick={() => setScena(s.v)}
                      aria-pressed={s.v === scena}
                      disabled={stato === "lavoro"}
                      className={`focus-ring rounded-full border px-3.5 py-2 text-[0.85rem] transition-colors disabled:opacity-60 ${
                        s.v === scena ? "border-amber/60 bg-amber/15 font-semibold text-foreground" : "border-border text-muted hover:border-amber/40"
                      }`}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:self-center">
                <button
                  type="button"
                  onClick={genera}
                  disabled={stato === "lavoro"}
                  className="focus-ring inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-amber px-7 text-[1rem] font-bold text-on-amber transition-colors hover:bg-amber-hover disabled:opacity-70 lg:w-auto"
                >
                  {stato === "lavoro" ? `Sul set… ${secondi}s` : "Genera gratis ⚡"}
                </button>
              </div>
            </div>

            {messaggio && (
              <p className="mt-4 rounded-xl border border-blocked/40 bg-blocked/10 px-4 py-3 text-[0.88rem] text-foreground">{messaggio}</p>
            )}

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[0.8rem] text-faint">
              <span><strong className="font-semibold text-muted">Una prova al giorno.</strong> Senza registrarti.</span>
              <span><strong className="font-semibold text-muted">La persona viene pagata lo stesso.</strong> Anche se a te non costa niente.</span>
              <span><strong className="font-semibold text-muted">La foto esce con la filigrana.</strong> Pulita si scarica dall&apos;account.</span>
            </div>
          </>
        ) : (
          esito && <Risultato esito={esito} onAncora={() => { setEsito(null); setStato("fermo"); }} />
        )}
      </div>
    </section>
  );
}

function Risultato({ esito, onAncora }: { esito: Esito; onAncora: () => void }) {
  const eur = esito.pagato_cent != null ? (esito.pagato_cent / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" }) : null;
  return (
    <div className="grid gap-7 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10">
      <div className="relative overflow-hidden rounded-[20px] border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={esito.immagine} alt={`Prova con ${esito.alias ?? "una persona del registro"}`} className="block w-full" />
        <span className="absolute bottom-3 left-3 rounded-full bg-[rgba(12,15,23,0.72)] px-3 py-1.5 text-[0.72rem] text-[#F2E9D8]">
          ✓ Certificato {esito.certificato.slice(0, 8)}
        </span>
      </div>

      <div>
        <span className="kicker text-amber">LA TUA PROVA</span>
        <h2 className="mt-2.5 text-balance text-[1.9rem] font-bold leading-[1.05] tracking-[-0.04em] sm:text-[2.4rem]">
          {esito.alias ? `Questa è ${esito.alias}.` : "Questa è una persona vera."}
          <br />
          Ed è una persona vera.
        </h2>
        <p className="mt-3 max-w-[52ch] text-pretty text-[0.98rem] leading-relaxed text-muted">
          Non è un volto inventato: è una persona iscritta al registro, con documento verificato, che ha detto sì
          all&apos;uso commerciale e che per questo scatto ha già ricevuto la sua quota. Il certificato è dentro i pixel:
          chiunque può controllarlo.
        </p>

        <div className="mt-5 rounded-2xl border border-border bg-[rgba(255,255,255,0.04)] p-4">
          <p className="kicker text-amber">COSA È SUCCESSO DAVVERO</p>
          <div className="mt-2.5 flex flex-col">
            <Riga k="Persona" v={`${esito.alias ?? esito.handle}${esito.consenso_dal ? ` · consenso attivo dal ${new Date(esito.consenso_dal).toLocaleDateString("it-IT")}` : ""}`} />
            {esito.somiglianza != null && <Riga k="Somiglianza misurata" v={`${esito.somiglianza}%`} />}
            <Riga k="Volti protetti nello scatto" v="nessuno" />
            {eur && <Riga k={`Quota pagata a ${esito.alias ?? "lei"}`} v={eur} />}
            <Riga k="Costo per te" v="0,00 €" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href="/signup" className="focus-ring inline-flex h-12 items-center rounded-full bg-amber px-6 text-[0.95rem] font-bold text-on-amber transition-colors hover:bg-amber-hover">
            Entra e scaricala pulita
          </Link>
          <Link href={`/passport/${esito.handle}`} className="focus-ring inline-flex h-12 items-center rounded-full border border-border px-5 text-[0.95rem] font-semibold transition-colors hover:border-amber/60">
            Vedi il passaporto di {esito.alias ?? esito.handle}
          </Link>
          <button type="button" onClick={onAncora} className="focus-ring inline-flex h-12 items-center px-2 text-[0.9rem] font-semibold text-muted hover:text-foreground">
            Indietro
          </button>
        </div>
        <p className="mt-3 text-[0.78rem] leading-relaxed text-faint">
          La prova gratis si ferma qui: una al giorno, con la filigrana. Dentro l&apos;account la stessa foto esce pulita,
          in alta, col kit dei formati e la liberatoria.
        </p>
      </div>
    </div>
  );
}

function Riga({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-hairline-soft py-2 text-[0.85rem] first:border-t-0 first:pt-0">
      <span className="text-muted">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  );
}
