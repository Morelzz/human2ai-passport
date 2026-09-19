"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatEur } from "@/lib/wallet";
import { voltStr, VOLT_STRINGS } from "@/lib/strings/volt";
import { useDictation } from "@/components/voice/useDictation";
import { joinScene } from "@/lib/voice/dictation";
import { AgeGateModal } from "../AgeGateModal";
import {
  LOOKS, FORMATI, INQUADRATURE, ESPRESSIONI, POSE, IDEE, RUOLI,
  qualitaPer, terminiNonFoto, ridimensiona, nomi,
  type FormatoVal, type QualitaVal, type Idea,
} from "./opzioni";
import { SceltaVolto, type Volto } from "./SceltaVolto";
import { SulSet, type StatoSet } from "./SulSet";
import { Risultato, type Esito } from "./Risultato";
import { MAX_PERSONE_GRUPPO, prezzoGruppo, scattiPerGruppo } from "@/lib/gruppo-prezzi";

export interface Scatto { certificate: string; image_url: string | null; alias: string }

type Pannello = "look" | "formato" | "qualita" | "regia" | null;
type Riferimento = { dataUrl: string; role: string };

const FMT = new Intl.NumberFormat("it-IT");

// Crea, flusso "una frase sola" (mockup approvato il 17/9/2026): un volto, una
// frase, quattro scelte a pillola e il pulsante. Tutto il resto lo imposta il
// set. Stessa API di prima (/api/generate asincrono + /api/generate/job/[id]).
export function CreaClient({
  volti,
  iniziale,
  ultimi,
}: {
  volti: Volto[];
  iniziale: string | null;
  ultimi: Scatto[];
}) {
  const [scelto, setScelto] = useState<string | null>(() => (iniziale && volti.some((v) => v.handle === iniziale) ? iniziale : null));
  const [sceltaAperta, setSceltaAperta] = useState(false);
  const [scena, setScena] = useState("");
  const [look, setLook] = useState("naturale");
  const [formato, setFormato] = useState<FormatoVal>("verticale");
  const [qualita, setQualita] = useState<QualitaVal>("alta");
  const [inquadratura, setInquadratura] = useState("auto");
  const [espressione, setEspressione] = useState("auto");
  const [posa, setPosa] = useState("nessuna");
  const [riferimenti, setRiferimenti] = useState<Riferimento[]>([]);
  const [pannello, setPannello] = useState<Pannello>(null);

  const [fase, setFase] = useState<"componi" | "set" | "fatto">("componi");
  const [statoSet, setStatoSet] = useState<StatoSet>("invio");
  const [inizio, setInizio] = useState(0);
  const [esito, setEsito] = useState<Esito | null>(null);
  const [sessione, setSessione] = useState<Esito[]>([]);

  const [errore, setErrore] = useState<string | null>(
    iniziale && !volti.some((v) => v.handle === iniziale) ? "Questo volto non è disponibile per nuovi scatti. Scegline un altro dal registro." : null,
  );
  const [voltGate, setVoltGate] = useState<{ needed: number; missing: number; balance: number } | null>(null);
  const [ageGate, setAgeGate] = useState(false);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [proposta, setProposta] = useState<string | null>(null);
  const [miglioro, setMiglioro] = useState(false);
  // Casting automatico: se non scegli nessuno, alla pressione di Genera sceglie
  // Semblic dal registro (lib/casting) e poi lo dice.
  const [sceltoDaSemblic, setSceltoDaSemblic] = useState(false);
  const [castingInCorso, setCastingInCorso] = useState(false);
  const [dubbio, setDubbio] = useState<{ ruolo: string; volto: Volto; differenze: string[] } | null>(null);
  const [inScena, setInScena] = useState<string | null>(null);
  // Scena di gruppo: la proposta del casting (prima di spendere) e il gruppo al lavoro.
  const [propostaGruppo, setPropostaGruppo] = useState<{ ruolo: string; volto: Volto; vicino: boolean; fisso: boolean }[] | null>(null);
  const [inGruppo, setInGruppo] = useState<Volto[] | null>(null);
  const vivo = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    vivo.current = true;
    fetch("/api/volt").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.configured) setSaldo(d.balance); }).catch(() => {});
    return () => { vivo.current = false; };
  }, []);

  useEffect(() => {
    if (!pannello) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPannello(null); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [pannello]);

  const dettatura = useDictation(useCallback((pezzo: string) => setScena((s) => joinScene(s, pezzo)), []));

  const volto = volti.find((v) => v.handle === scelto) ?? null;
  const lookSel = LOOKS.find((l) => l.v === look) ?? LOOKS[0];
  const livelli = useMemo(() => qualitaPer(formato), [formato]);
  const livello = livelli.find((q) => q.v === qualita) ?? livelli[1];
  const formatoSel = FORMATI.find((f) => f.v === formato) ?? FORMATI[0];
  const regiaAttiva = [inquadratura !== "auto", espressione !== "auto", posa !== "nessuna"].filter(Boolean).length;
  const avvisoFoto = terminiNonFoto(scena);
  const puoGenerare = scena.trim().length >= 3 || (Boolean(volto) && riferimenti.length > 0);
  const riepilogo = `${lookSel.l} · ${formatoSel.l} · ${livello.l}`;
  const miniatura = volto?.src ?? volti[0]?.src ?? "";

  function suInizio() {
    const lenis = (window as Window & { __lenis?: { scrollTo: (t: number, o?: { immediate?: boolean }) => void } }).__lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo({ top: 0 });
  }

  function usaIdea(i: Idea) {
    setScena(i.testo);
    setFormato(i.formato);
    setLook(i.look);
    setInquadratura(i.inquadratura ?? "auto");
    setPosa(i.posa ?? "nessuna");
    setProposta(null);
  }

  async function aggiungiRiferimento(file: File | undefined) {
    if (!file || riferimenti.length >= 2) return;
    try {
      const dataUrl = await ridimensiona(file);
      setRiferimenti((r) => {
        const haCapo = r.some((x) => x.role === "outfit");
        return [...r, { dataUrl, role: haCapo ? "sfondo" : "outfit" }].slice(0, 2);
      });
    } catch {
      setErrore("Questa immagine non si riesce a leggere, prova con un'altra.");
    }
  }

  async function migliora() {
    if (!scena.trim()) return;
    setMiglioro(true);
    setErrore(null);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: scena, category: null, photo: [], refs: riferimenti.map((r) => r.role) }),
      });
      const j = await res.json();
      if (!res.ok) setErrore(j.error ?? "Non sono riuscito a migliorare la frase");
      else setProposta(j.enhanced);
    } catch {
      setErrore("Non sono riuscito a migliorare la frase, riprova");
    }
    setMiglioro(false);
  }

  // Casting: legge la scena e sceglie i volti. Con un volto gia' scelto (fisso)
  // quel volto resta; se la scena ha una persona sola si scatta subito con lui,
  // se ne ha di piu' si propone la scena di gruppo con lui per primo.
  async function casting(fisso?: Volto) {
    if (scena.trim().length < 4) { if (fisso) await genera(fisso, sceltoDaSemblic); else setSceltaAperta(true); return; }
    setCastingInCorso(true);
    setErrore(null);
    setDubbio(null);
    setPropostaGruppo(null);
    try {
      const res = await fetch("/api/crea/casting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scena, scelto: fisso?.handle }) });
      const j = await res.json();
      setCastingInCorso(false);
      if (!res.ok) {
        if (fisso) { await genera(fisso, sceltoDaSemblic); return; } // il volto c'e' gia': non si blocca nessuno
        setErrore(j.error ?? "Non riesco a scegliere il volto, sceglilo tu");
        return;
      }
      const persone = (j.persone ?? []) as { ruolo: string; fisso?: boolean; corrispondenza: "esatto" | "vicino" | null; differenze: string[]; volto: Volto | null }[];
      if (fisso && (persone.length === 0 || (persone.length === 1 && persone[0].volto?.handle === fisso.handle))) {
        await genera(fisso, sceltoDaSemblic);
        return;
      }
      if (persone.length === 0) {
        setErrore("In questa scena non c'è nessuno. Semblic mette in scena persone vere del registro: scrivi chi c'è nella foto.");
        return;
      }
      if (persone.length > 1) {
        const lista = persone.slice(0, MAX_PERSONE_GRUPPO).map((p) => ({
          ruolo: p.ruolo,
          volto: p.volto ? volti.find((x) => x.handle === p.volto!.handle) ?? p.volto : null,
          vicino: p.corrispondenza === "vicino",
          fisso: Boolean(p.fisso),
        }));
        const manca = lista.find((x) => !x.volto);
        if (manca) {
          setErrore(`Nel registro non c'è ancora nessuno per "${manca.ruolo}". Riscrivi la scena, o scegli tu un volto solo.`);
          return;
        }
        setPropostaGruppo(lista as { ruolo: string; volto: Volto; vicino: boolean; fisso: boolean }[]);
        return;
      }
      const p = persone[0];
      const v = p.volto ? volti.find((x) => x.handle === p.volto!.handle) ?? p.volto : null;
      if (!v) {
        setErrore(`Nel registro non c'è ancora nessuno per "${p.ruolo}". Scegli tu un volto, o riscrivi la scena.`);
        return;
      }
      if (p.corrispondenza === "vicino") {
        setDubbio({ ruolo: p.ruolo, volto: v, differenze: p.differenze });
        return;
      }
      setScelto(v.handle);
      setSceltoDaSemblic(true);
      setInScena(p.ruolo);
      await genera(v, true);
    } catch {
      setCastingInCorso(false);
      if (fisso) { await genera(fisso, sceltoDaSemblic); return; }
      setErrore("Non riesco a scegliere il volto, sceglilo tu");
    }
  }

  function corpoScatto() {
    return {
      mode: "commercial",
      category: null,
      scene: scena.trim(),
      engine: "echo",
      echoSize: livello.size,
      echoQuality: livello.quality,
      extraRefs: riferimenti.map((r) => ({ data: r.dataUrl, desc: "", role: r.role })),
      pose: posa,
      framing: inquadratura === "auto" ? null : inquadratura,
      expression: espressione === "auto" ? null : espressione,
      colorStyle: lookSel.colorStyle,
      camera: lookSel.camera,
      lens: lookSel.lens,
      light: null,
      styleId: null,
    };
  }

  async function genera(override?: Volto, dalCasting = false) {
    const volto = override ?? volti.find((v) => v.handle === scelto) ?? null;
    if (!volto) { await casting(); return; }
    if (!(scena.trim().length >= 3 || riferimenti.length > 0)) return;
    // Volto scelto e Genera premuto: prima si legge la scena, magari ci sono altre persone.
    if (!override) { await casting(volto); return; }
    const perSemblic = dalCasting || (sceltoDaSemblic && !override);
    setInGruppo(null);
    await avvia({ handle: volto.handle, ...corpoScatto() }, volto, perSemblic, null);
  }

  // Scena di gruppo "un volto alla volta": niente riferimenti, posa, inquadratura
  // ed espressione del singolo; look e formato restano.
  async function generaGruppo(lista: Volto[], dalCasting: boolean) {
    if (lista.length < 2 || scena.trim().length < 3) return;
    setPropostaGruppo(null);
    setInGruppo(lista);
    await avvia(
      { handle: lista[0].handle, gruppo: lista.map((v) => v.handle), ...corpoScatto(), extraRefs: [], pose: "nessuna", framing: null, expression: null },
      lista[0],
      dalCasting,
      lista,
    );
  }

  async function avvia(corpo: Record<string, unknown>, volto: Volto, perSemblic: boolean, gruppo: Volto[] | null) {
    setPannello(null);
    setErrore(null);
    setVoltGate(null);
    setStatoSet("invio");
    const t0 = Date.now();
    setInizio(t0);
    setFase("set");
    suInizio();

    let res: Response;
    let j: Record<string, unknown>;
    try {
      res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      j = await res.json();
    } catch {
      setFase("componi");
      setErrore("Connessione persa. Se lo scatto è partito lo trovi in I miei contenuti, altrimenti riprova.");
      return;
    }

    if (res.status === 402 && j.volt) { setFase("componi"); setVoltGate(j.volt as { needed: number; missing: number; balance: number }); return; }
    if (res.status === 403 && j.code === "age_unverified") { setFase("componi"); setAgeGate(true); return; }
    if (!res.ok) {
      setFase("componi");
      const msg = String(j.error ?? "Lo scatto non è partito");
      if (j.volt_refunded) {
        window.dispatchEvent(new Event("volt:refetch"));
        setErrore(`${msg}. ${voltStr("gen.refund.toast", { n: FMT.format(Number(j.volt_refunded)) })}`);
      } else setErrore(msg);
      return;
    }

    const volt = j.volt as { spent: number; balance: number | null } | undefined;
    if (volt && volt.balance !== null) {
      setSaldo(volt.balance);
      window.dispatchEvent(new CustomEvent("volt:update", { detail: { balance: volt.balance } }));
    }
    if (j.mode !== "async" || !j.jobId) {
      setFase("componi");
      setErrore("Risposta inattesa dal server. Se hai speso VOLT, controlla I miei contenuti.");
      return;
    }
    setStatoSet("coda");
    await segui(String(j.jobId), volto, volt, t0, perSemblic, gruppo);
  }

  async function segui(jobId: string, v: Volto, volt: { spent: number } | undefined, t0: number, perSemblic = false, gruppo: Volto[] | null = null) {
    const limite = t0 + 20 * 60 * 1000;
    while (vivo.current && Date.now() < limite) {
      await new Promise((r) => setTimeout(r, 3000));
      if (!vivo.current) return;
      let pj: Record<string, unknown>;
      try {
        const r = await fetch(`/api/generate/job/${jobId}`);
        pj = await r.json();
        if (!r.ok) { setFase("componi"); setErrore(String(pj.error ?? "Non riesco a seguire lo scatto")); return; }
      } catch {
        continue;
      }
      if (pj.status === "running") setStatoSet("lavoro");
      if (pj.status === "done" && pj.certificate) {
        const nuovo: Esito = {
          certificate: String(pj.certificate),
          generationId: pj.generation_id ? String(pj.generation_id) : undefined,
          somiglianza: typeof pj.identity_score === "number" ? pj.identity_score : undefined,
          dalCasting: perSemblic,
          persone: gruppo
            ? (Array.isArray(pj.persone) && pj.persone.length ? (pj.persone as Esito["persone"]) : gruppo.map((g) => ({ handle: g.handle, alias: g.alias, somiglianza: null })))
            : undefined,
          alias: gruppo ? nomi(gruppo.map((g) => g.alias)) : v.alias,
          handle: v.handle,
          size: pj.size ? String(pj.size) : livello.size,
          grossCents: Number(pj.gross_cents ?? 0),
          royaltyCents: Number(pj.royalty_cents ?? 0),
          spent: volt?.spent,
          riepilogo,
          secondi: Math.round((Date.now() - t0) / 1000),
        };
        setEsito(nuovo);
        setSessione((s) => [nuovo, ...s]);
        setFase("fatto");
        suInizio();
        return;
      }
      if (pj.status === "error") {
        window.dispatchEvent(new Event("volt:refetch"));
        setFase("componi");
        if (volt?.spent) {
          setSaldo((b) => (b === null ? b : b + volt.spent));
          setErrore(`${String(pj.error ?? "Lo scatto non è riuscito")}. ${voltStr("gen.refund.toast", { n: FMT.format(volt.spent) })}`);
        } else setErrore(String(pj.error ?? "Lo scatto non è riuscito"));
        return;
      }
    }
    if (!vivo.current) return;
    setFase("componi");
    setErrore("Lo scatto è ancora in lavorazione (la coda può essere piena). Puoi lasciare la pagina: lo trovi in I miei contenuti appena è pronto.");
  }

  // ── Viste del set e del risultato ──────────────────────────────────────────
  if (fase === "set" && inGruppo) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <SulSet
          alias={nomi(inGruppo.map((v) => v.alias))}
          ritratto={inGruppo[0].src}
          stato={statoSet}
          inizio={inizio}
          riepilogo={`${riepilogo} · ${inGruppo.length} persone`}
          volt={saldo !== null ? livello.volt * scattiPerGruppo(inGruppo.length) : null}
          inScena={sceltoDaSemblic ? "gruppo" : null}
          gruppo={inGruppo.map((v) => v.alias)}
        />
      </main>
    );
  }
  if (fase === "set" && volto) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <SulSet alias={volto.alias} ritratto={volto.src} stato={statoSet} inizio={inizio} riepilogo={riepilogo} volt={saldo !== null ? livello.volt : null} inScena={sceltoDaSemblic ? inScena : null} />
      </main>
    );
  }
  if (fase === "fatto" && esito) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <Risultato
          esito={esito}
          sessione={sessione}
          onScegli={setEsito}
          onVariante={() => {
            const g = esito.persone && esito.persone.length > 1 ? esito.persone.map((p) => volti.find((v) => v.handle === p.handle)).filter((v): v is Volto => Boolean(v)) : null;
            if (g && g.length > 1) void generaGruppo(g, Boolean(esito.dalCasting));
            else {
              const v = volti.find((x) => x.handle === esito.handle);
              if (v) void genera(v, Boolean(esito.dalCasting));
              else void genera();
            }
          }}
          onNuovo={() => { setFase("componi"); suInizio(); }}
          onCambiaPersona={() => { setFase("componi"); setSceltaAperta(true); suInizio(); }}
          varianteVolt={saldo !== null ? livello.volt * (esito.persone && esito.persone.length > 1 ? scattiPerGruppo(esito.persone.length) : 1) : null}
        />
      </main>
    );
  }

  // ── Pillole e pannelli ─────────────────────────────────────────────────────
  const pillola = (id: Exclude<Pannello, null>, etichetta: string) => (
    <button
      type="button"
      onClick={() => setPannello((p) => (p === id ? null : id))}
      aria-expanded={pannello === id}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[0.9rem] transition-colors ${
        pannello === id ? "border-foreground bg-surface text-foreground" : "border-border bg-surface text-foreground hover:border-amber/60"
      }`}
    >
      {etichetta}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="text-faint" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
    </button>
  );

  const icona = {
    mic: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></svg>,
    img: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></svg>,
    su: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>,
    stella: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>,
  };

  const bottoneMic = dettatura.supported ? (
    <button
      type="button"
      onClick={dettatura.toggle}
      aria-pressed={dettatura.listening}
      aria-label={dettatura.listening ? "Ferma la dettatura" : "Detta la scena a voce"}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors sm:h-10 sm:w-10 ${
        dettatura.listening ? "border-amber bg-amber-soft text-amber-ink" : "border-border bg-surface text-foreground hover:border-amber/60"
      }`}
    >
      {dettatura.listening && <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full bg-amber/25" />}
      {icona.mic}
    </button>
  ) : null;

  const bottoneRif = (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      disabled={riferimenti.length >= 2}
      aria-label="Aggiungi un riferimento: un capo, un luogo o un oggetto"
      title="Aggiungi un riferimento"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-amber/60 disabled:opacity-40"
    >
      {icona.img}
    </button>
  );

  const prezzo = saldo !== null ? `${FMT.format(livello.volt)} ⚡` : formatEur(livello.volt);
  const pillole = (
    <>
      {pillola("look", lookSel.l)}
      {pillola("formato", formatoSel.l)}
      {pillola("qualita", livello.l)}
      {pillola("regia", regiaAttiva ? `Regia · ${regiaAttiva}` : "Regia")}
    </>
  );

  const scheda = (
    chiave: string,
    attivo: boolean,
    onClick: () => void,
    contenuto: React.ReactNode,
    extra = "",
  ) => (
    <button
      key={chiave}
      type="button"
      onClick={onClick}
      aria-pressed={attivo}
      className={`rounded-2xl bg-surface text-left transition-shadow ${attivo ? "ring-2 ring-amber" : "ring-1 ring-[var(--hairline)] hover:ring-amber/50"} ${extra}`}
    >
      {contenuto}
    </button>
  );

  const chip = (attivo: boolean, onClick: () => void, testo: string) => (
    <button
      key={testo}
      type="button"
      onClick={onClick}
      aria-pressed={attivo}
      className={`h-10 rounded-full border px-3.5 text-[0.9rem] transition-colors ${attivo ? "border-foreground bg-foreground text-[var(--bg)]" : "border-border bg-surface text-foreground hover:border-amber/60"}`}
    >
      {testo}
    </button>
  );

  const contenutoPannello =
    pannello === "look" ? (
      <>
        <p className="mb-3 text-[0.95rem] font-semibold">Che aria deve avere?</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {LOOKS.map((l) =>
            scheda(l.v, l.v === look, () => { setLook(l.v); setPannello(null); }, (
              <span className="flex flex-col overflow-hidden rounded-2xl">
                <span className="block h-24 overflow-hidden bg-[var(--hairline)]">
                  {miniatura && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={miniatura} alt="" className="h-full w-full object-cover object-[center_12%]" style={{ filter: l.filtro }} />
                  )}
                </span>
                <span className="flex flex-col px-3 py-2">
                  <span className="text-[0.92rem] font-semibold">{l.l}</span>
                  <span className="text-[0.78rem] text-muted">{l.desc}</span>
                </span>
              </span>
            ), "overflow-hidden"),
          )}
        </div>
      </>
    ) : pannello === "formato" ? (
      <>
        <p className="mb-3 text-[0.95rem] font-semibold">Formato</p>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {FORMATI.map((f) =>
            scheda(f.v, f.v === formato, () => { setFormato(f.v); setPannello(null); }, (
              <span className="flex items-center gap-3 px-4 py-3">
                <span aria-hidden className={`shrink-0 rounded-[4px] border-2 border-foreground ${f.v === "verticale" ? "h-6 w-4" : f.v === "quadrato" ? "h-5 w-5" : "h-4 w-6"}`} />
                <span className="flex flex-col">
                  <span className="text-[0.95rem] font-semibold">{f.l}</span>
                  <span className="text-[0.8rem] text-muted">{f.desc}</span>
                </span>
              </span>
            )),
          )}
        </div>
      </>
    ) : pannello === "qualita" ? (
      <>
        <p className="mb-3 text-[0.95rem] font-semibold">Qualità e prezzo</p>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {livelli.map((q) =>
            scheda(q.v, q.v === qualita, () => { setQualita(q.v); setPannello(null); }, (
              <span className="flex flex-col gap-1 px-4 py-3">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[0.95rem] font-semibold">{q.l}</span>
                  <span className="text-[0.95rem] font-bold tabular-nums">{saldo !== null ? `${q.volt} ⚡` : formatEur(q.volt)}</span>
                </span>
                <span className="text-[0.8rem] text-muted">{q.desc} · {q.size.replace("x", "×")}</span>
                {volto && <span className="text-[0.8rem] text-verified">{formatEur(q.royaltyCents)} a {volto.alias}</span>}
              </span>
            )),
          )}
        </div>
      </>
    ) : pannello === "regia" ? (
      <>
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="text-[0.95rem] font-semibold">Regia fine</p>
          {regiaAttiva > 0 && (
            <button type="button" onClick={() => { setInquadratura("auto"); setEspressione("auto"); setPosa("nessuna"); }} className="text-[0.85rem] font-semibold text-amber-ink hover:underline">
              Torna tutto automatico
            </button>
          )}
        </div>
        <p className="mb-3 text-[0.85rem] text-muted">Facoltativa: se non scegli niente, decide il set leggendo la tua frase.</p>
        <p className="mb-2 text-[0.8rem] font-semibold text-muted">Inquadratura</p>
        <div className="mb-3 flex flex-wrap gap-2">{INQUADRATURE.map((o) => chip(o.v === inquadratura, () => setInquadratura(o.v), o.l))}</div>
        <p className="mb-2 text-[0.8rem] font-semibold text-muted">Espressione</p>
        <div className="mb-3 flex flex-wrap gap-2">{ESPRESSIONI.map((o) => chip(o.v === espressione, () => setEspressione(o.v), o.l))}</div>
        <p className="mb-2 text-[0.8rem] font-semibold text-muted">Posa</p>
        <div className="flex flex-wrap gap-2">{POSE.map((o) => chip(o.v === posa, () => setPosa(o.v), o.l))}</div>
      </>
    ) : null;

  return (
    <main className="mx-auto w-full max-w-[960px] px-5 pb-[250px] pt-8 sm:px-8 sm:pb-20 sm:pt-14">
      <div className="flex flex-col items-start sm:items-center sm:text-center">
        <span className="kicker">Crea</span>
        <h1 className="mt-3 text-balance text-[2.2rem] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[3.4rem]">
          Una persona vera. Una frase.<br className="hidden sm:block" /> Uno scatto certificato.
        </h1>
        <p className="mt-3 max-w-[60ch] text-pretty text-[1rem] leading-relaxed text-muted sm:text-[1.08rem]">
          Scegli chi e scrivi cosa succede. Luce, posa e formato li imposta il set: li cambi con un tocco.
        </p>
      </div>

      {/* ── Il compositore: in pagina su desktop, agganciato in basso sul telefono ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 sm:relative sm:inset-auto sm:z-auto sm:mt-8">
        <div className="rounded-t-[26px] border border-border bg-surface px-3.5 pb-4 pt-3 shadow-[0_-18px_40px_-26px_rgba(23,21,15,0.35)] sm:rounded-[28px] sm:px-5 sm:pb-4 sm:pt-4 sm:shadow-[0_34px_70px_-40px_rgba(23,21,15,0.4)]">
          <div className="senza-barra flex items-center gap-2 overflow-x-auto">
            <span className="hidden text-[0.95rem] text-faint sm:inline">Con</span>
            <button
              type="button"
              onClick={() => setSceltaAperta(true)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full pr-3 text-[0.95rem] font-semibold transition-colors ${
                volto ? "bg-amber-soft pl-1 text-on-amber" : "border border-amber/50 bg-surface pl-3 text-amber-ink"
              }`}
            >
              {volto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={volto.src} alt="" className="h-8 w-8 rounded-full object-cover object-top" />
              ) : null}
              {!volto && icona.stella}
              {volto ? volto.alias : "Semblic sceglie per te"}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {volto && (
              <span className="hidden items-center gap-1.5 text-[0.85rem] text-verified sm:inline-flex">
                <i aria-hidden className="h-1.5 w-1.5 rounded-full bg-verified" />
                {sceltoDaSemblic ? "scelta da Semblic" : "consenso attivo"}
              </span>
            )}
            {volto && sceltoDaSemblic && (
              <button type="button" onClick={() => { setScelto(null); setSceltoDaSemblic(false); }} className="hidden text-[0.85rem] font-semibold text-amber-ink hover:underline sm:inline">
                fai scegliere di nuovo
              </button>
            )}
            <span className="flex gap-2 sm:hidden">{pillole}{bottoneRif}</span>
            <button
              type="button"
              onClick={migliora}
              disabled={miglioro || !scena.trim()}
              className="ml-auto hidden h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.85rem] font-semibold text-amber-ink transition-opacity hover:bg-amber-soft disabled:opacity-40 sm:inline-flex"
            >
              {icona.stella}
              {miglioro ? "Rifinisco…" : "Rendila più precisa"}
            </button>
          </div>

          <div className="mt-2.5 flex items-end gap-2 sm:mt-2">
            <label htmlFor="frase" className="sr-only">Cosa succede nella foto</label>
            <textarea
              id="frase"
              value={scena}
              onChange={(e) => { setScena(e.target.value); setProposta(null); setPropostaGruppo(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); genera(); } }}
              placeholder="Cosa succede nella foto? Es. cammina in centro al tramonto"
              rows={2}
              className="min-h-[64px] flex-1 resize-none rounded-2xl bg-[var(--bg)] px-3.5 py-3 text-[16px] leading-snug text-foreground outline-none placeholder:text-faint sm:min-h-[76px] sm:rounded-none sm:bg-transparent sm:px-1 sm:text-[1.35rem] sm:leading-[1.45]"
            />
            <span className="flex gap-2 sm:hidden">
              {bottoneMic}
              <button
                type="button"
                onClick={() => genera()}
                disabled={!puoGenerare || castingInCorso}
                aria-label={`Genera, ${prezzo}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber text-on-amber transition-opacity disabled:opacity-40"
              >
                {icona.su}
              </button>
            </span>
          </div>

          {dettatura.listening && (
            <p className="mt-1 truncate px-1 text-[0.82rem] italic text-muted" aria-live="polite">{dettatura.interim || "Parla pure…"}</p>
          )}
          {dettatura.error && <p className="mt-1 px-1 text-[0.82rem] text-blocked">{dettatura.error}</p>}
          {avvisoFoto.length > 0 && (
            <p className="mt-1.5 px-1 text-[0.82rem] leading-snug text-amber-ink">
              Semblic fa fotografie: con «{avvisoFoto.join("», «")}» il volto rischia di non somigliare. Descrivi una scena reale.
            </p>
          )}
          {proposta && (
            <div className="mt-2 rounded-2xl border border-amber/40 bg-amber-soft/60 p-3">
              <p className="text-[0.92rem] leading-relaxed">{proposta}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => { setScena(proposta); setProposta(null); }} className="h-9 rounded-full bg-foreground px-4 text-[0.85rem] font-semibold text-[var(--bg)]">Usa questa</button>
                <button type="button" onClick={() => setProposta(null)} className="h-9 rounded-full border border-border px-4 text-[0.85rem] font-semibold">Tieni la mia</button>
              </div>
            </div>
          )}

          {riferimenti.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2.5 px-1">
              {riferimenti.map((r, i) => (
                <div key={i} className="flex items-center gap-2 rounded-2xl border border-border bg-[var(--bg)] p-1.5 pr-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.dataUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
                  <label className="sr-only" htmlFor={`ruolo-${i}`}>Cos&apos;è questo riferimento</label>
                  <select
                    id={`ruolo-${i}`}
                    value={r.role}
                    onChange={(e) => setRiferimenti((all) => all.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                    className="h-9 rounded-full border border-border bg-surface px-2.5 text-[16px] sm:text-[0.85rem]"
                  >
                    {RUOLI.filter((o) => o.v !== "outfit" || r.role === "outfit" || !riferimenti.some((x, j) => j !== i && x.role === "outfit")).map((o) => (
                      <option key={o.v} value={o.v}>{o.l}</option>
                    ))}
                  </select>
                  <button type="button" aria-label="Togli il riferimento" onClick={() => setRiferimenti((all) => all.filter((_, j) => j !== i))} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Barra degli strumenti su desktop */}
          <div className="mt-3 hidden items-center justify-between gap-3 sm:flex">
            <div className="flex flex-wrap items-center gap-2">
              {pillole}
              {bottoneRif}
              {bottoneMic}
            </div>
            <div className="flex shrink-0 items-center gap-3.5">
              <span className="text-right text-[0.88rem] leading-tight text-muted">
                <span className="block font-semibold text-foreground">{prezzo}</span>
                {volto && <span className="block">{formatEur(livello.royaltyCents)} a {volto.alias}</span>}
              </span>
              <button
                type="button"
                onClick={() => genera()}
                disabled={!puoGenerare || castingInCorso}
                className="inline-flex h-[52px] items-center gap-2 rounded-full bg-amber px-6 text-[1rem] font-bold text-on-amber transition-colors hover:bg-amber-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {castingInCorso ? (volto ? "Leggo la scena…" : "Scelgo il volto…") : "Genera"}
                {icona.su}
              </button>
            </div>
          </div>

          <p className="mt-2 px-1 text-center text-[0.8rem] text-muted sm:hidden">
            {prezzo}
            {volto ? ` · ${formatEur(livello.royaltyCents)} a ${volto.alias}` : ""}
            {scena.trim() && (
              <>
                {" · "}
                <button type="button" onClick={migliora} disabled={miglioro} className="font-semibold text-amber-ink">{miglioro ? "rifinisco…" : "rendila più precisa"}</button>
              </>
            )}
          </p>

          {pannello && (
            <>
              <button type="button" aria-label="Chiudi" onClick={() => setPannello(null)} className="fixed inset-0 z-40 cursor-default bg-[rgba(12,15,23,0.35)] sm:bg-transparent" />
              <div className="fixed inset-x-0 bottom-0 z-50 max-h-[78vh] overflow-y-auto rounded-t-[26px] border border-border bg-[var(--bg)] p-5 shadow-[0_-24px_60px_-30px_rgba(12,15,23,0.5)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-[calc(100%+10px)] sm:w-full sm:rounded-[24px] sm:shadow-[0_30px_70px_-35px_rgba(12,15,23,0.45)]">
                {contenutoPannello}
              </div>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => { aggiungiRiferimento(e.target.files?.[0]); e.currentTarget.value = ""; }}
        />
      </div>

      {propostaGruppo && (() => {
        const n = propostaGruppo.length;
        const g = prezzoGruppo({ gross_cents: livello.volt, fee_cents: livello.volt - livello.royaltyCents, net_cents: livello.royaltyCents, surcharge_cents: 0 }, n);
        return (
          <div className="card mt-4 flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex shrink-0 -space-x-3">
                {propostaGruppo.map((x) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={x.volto.handle} src={x.volto.src} alt="" className="h-14 w-11 rounded-xl object-cover object-top ring-2 ring-[var(--surface)]" />
                ))}
              </div>
              <div className="min-w-0">
                <p className="text-[1rem] font-bold tracking-[-0.01em]">Scena di gruppo: {n} persone del registro</p>
                <p className="text-[0.88rem] leading-snug text-muted">
                  {propostaGruppo.map((x, i) => (
                    <span key={x.volto.handle}>
                      {i > 0 ? (i === n - 1 ? " e " : ", ") : ""}
                      <strong className="font-semibold text-foreground">{x.volto.alias}</strong>
                      {!x.fisso && x.ruolo.toLowerCase() !== x.volto.alias.toLowerCase() ? <> per &quot;{x.ruolo}&quot;</> : null}
                      {x.vicino && !x.fisso ? " (la persona più vicina)" : ""}
                    </span>
                  ))}
                </p>
              </div>
            </div>
            <p className="text-[0.85rem] leading-relaxed text-muted">
              Prima la scena, poi ogni volto rifatto con le foto verificate della sua persona: {scattiPerGruppo(n)} passaggi, qualche minuto.
              {" "}{formatEur(g.quote[n - 1])} a ciascuno.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const lista = propostaGruppo.map((x) => x.volto);
                  const daSemblic = propostaGruppo.every((x) => !x.fisso);
                  setSceltoDaSemblic(daSemblic);
                  setInScena("gruppo");
                  void generaGruppo(lista, daSemblic);
                }}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-amber px-5 text-[0.92rem] font-bold text-on-amber transition-colors hover:bg-amber-hover"
              >
                Crea la scena · {saldo !== null ? `${FMT.format(g.gross_cents)} ⚡` : formatEur(g.gross_cents)}
              </button>
              <button
                type="button"
                onClick={() => { const x = propostaGruppo[0]; setPropostaGruppo(null); setScelto(x.volto.handle); setSceltoDaSemblic(!x.fisso); setInScena(x.fisso ? null : x.ruolo); void genera(x.volto, !x.fisso); }}
                className="h-11 rounded-full border border-border px-4 text-[0.88rem] font-semibold"
              >
                Solo {propostaGruppo[0].volto.alias} · {saldo !== null ? `${FMT.format(livello.volt)} ⚡` : formatEur(livello.volt)}
              </button>
              <button type="button" onClick={() => { setPropostaGruppo(null); setSceltaAperta(true); }} className="h-11 px-2 text-[0.88rem] font-semibold text-amber-ink hover:underline">
                Scelgo io
              </button>
            </div>
          </div>
        );
      })()}

      {dubbio && (
        <div className="card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dubbio.volto.src} alt="" className="h-14 w-11 shrink-0 rounded-xl object-cover object-top" />
            <p className="text-[0.92rem] leading-snug">
              Nel registro non c&apos;è ancora qualcuno esattamente come &quot;{dubbio.ruolo}&quot;. La persona più vicina è <strong>{dubbio.volto.alias}</strong>
              {dubbio.differenze.length ? `, con ${dubbio.differenze.join(" e ")} diversi` : ""}.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => { const d = dubbio; setDubbio(null); setScelto(d.volto.handle); setSceltoDaSemblic(true); setInScena(d.ruolo); void genera(d.volto, true); }}
              className="h-10 rounded-full bg-amber px-4 text-[0.88rem] font-bold text-on-amber"
            >
              Usa {dubbio.volto.alias}
            </button>
            <button type="button" onClick={() => { setDubbio(null); setSceltaAperta(true); }} className="h-10 rounded-full border border-border px-4 text-[0.88rem] font-semibold">
              Scelgo io
            </button>
          </div>
        </div>
      )}

      {(errore || voltGate) && (
        <div className="mt-4 flex flex-col gap-3">
          {errore && (
            <div role="alert" className="rounded-2xl border border-blocked/40 bg-blocked-soft px-4 py-3 text-[0.92rem] leading-snug text-on-blocked">
              {errore}
            </div>
          )}
          {voltGate && (
            <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.98rem] font-bold">{VOLT_STRINGS["volt.insufficient.title"]}</p>
                <p className="text-[0.88rem] text-muted">{voltStr("volt.insufficient.body", { n: FMT.format(voltGate.needed), delta: FMT.format(voltGate.missing) })}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href="/account/volt" className="inline-flex h-10 items-center rounded-full bg-amber px-4 text-[0.88rem] font-bold text-on-amber">{VOLT_STRINGS["volt.insufficient.cta"]}</Link>
                {qualita !== "bozza" && (
                  <button type="button" onClick={() => { setQualita("bozza"); setVoltGate(null); }} className="h-10 rounded-full border border-border px-4 text-[0.88rem] font-semibold">
                    Passa a Bozza veloce
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 sm:justify-center">
        <span className="text-[0.88rem] text-faint">{scena.trim() ? "Oppure parti da:" : "Parti da un'idea:"}</span>
        {IDEE.map((i) => (
          <button key={i.l} type="button" onClick={() => usaIdea(i)} className="h-9 rounded-full border border-border px-3.5 text-[0.88rem] text-foreground transition-colors hover:border-amber/60">
            {i.l}
          </button>
        ))}
      </div>

      <section className="mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[1.05rem] font-semibold">Volti del registro</h2>
          <button type="button" onClick={() => setSceltaAperta(true)} className="text-[0.9rem] font-semibold text-amber-ink hover:underline">
            Cerca per descrizione
          </button>
        </div>
        <div className="riga-scorrevole mt-4 sm:grid sm:grid-cols-7 sm:gap-3">
          {volti.slice(0, 7).map((v) => (
            <button
              key={v.handle}
              type="button"
              onClick={() => setScelto(v.handle)}
              aria-pressed={v.handle === scelto}
              className="flex w-[104px] flex-col gap-2 text-left sm:w-auto"
            >
              <span className={`block aspect-[3/4] overflow-hidden rounded-2xl bg-[var(--hairline)] ${v.handle === scelto ? "ring-[3px] ring-amber ring-offset-2 ring-offset-[var(--bg)]" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.src} alt="" loading="lazy" className="h-full w-full object-cover" />
              </span>
              <span className={`px-0.5 text-[0.88rem] ${v.handle === scelto ? "font-semibold" : ""}`}>{v.alias}</span>
            </button>
          ))}
        </div>
      </section>

      {(sessione.length > 0 || ultimi.length > 0) && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-[1.05rem] font-semibold">I tuoi ultimi scatti</h2>
            <Link href="/account" className="text-[0.9rem] font-semibold text-amber-ink hover:underline">I miei contenuti</Link>
          </div>
          <div className="riga-scorrevole mt-4 sm:grid sm:grid-cols-4 sm:gap-3">
            {sessione.map((s) => (
              <button key={s.certificate} type="button" onClick={() => { setEsito(s); setFase("fatto"); suInizio(); }} className="relative block h-[150px] w-[200px] overflow-hidden rounded-2xl bg-[var(--hairline)] sm:w-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/content/${s.certificate}`} alt={`Scatto con ${s.alias}`} loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[rgba(12,15,23,0.66)] px-2.5 py-1 text-[0.72rem] text-[#F2E9D8]">Certificato</span>
              </button>
            ))}
            {ultimi.filter((u) => !sessione.some((s) => s.certificate === u.certificate)).slice(0, Math.max(0, 4 - sessione.length)).map((u) => (
              <Link key={u.certificate} href={`/studio/edit/${u.certificate}`} className="relative block h-[150px] w-[200px] overflow-hidden rounded-2xl bg-[var(--hairline)] sm:w-auto">
                {u.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.image_url} alt={`Scatto con ${u.alias}`} loading="lazy" className="h-full w-full object-cover" />
                )}
                <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[rgba(12,15,23,0.66)] px-2.5 py-1 text-[0.72rem] text-[#F2E9D8]">Certificato</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {sceltaAperta && (
        <SceltaVolto
          volti={volti}
          scelto={scelto}
          onScegli={(h) => { setScelto(h); setSceltoDaSemblic(false); setSceltaAperta(false); setErrore(null); setDubbio(null); }}
          onChiudi={() => setSceltaAperta(false)}
        />
      )}
      {ageGate && (
        <AgeGateModal
          onClose={() => setAgeGate(false)}
          onConfirmed={() => { setAgeGate(false); genera(); }}
        />
      )}
    </main>
  );
}
