"use client";

// ──────────────────────────────────────────────────────────────────────────
// EditorClient — il "Semblic Editor" di post-produzione (Fase 1).
// Layout dai prototipi: MOBILE (design/anteprima_editor_mobile.html) = immagine
// FISSA in alto, parametri scrollabili sotto, barra Esporta in fondo. DESKTOP
// (design/anteprima_editor_postproduzione.html) = immagine a sinistra STICKY,
// pannello parametri a destra che scorre.
// Fase 1: Preset+intensita, Luce, Colore, anteprima live, confronto, reset.
// Export = download esistente con provenienza (la resa delle modifiche e
// server-side, arriva in fase 3). Editing NON distruttivo: stato in EditState.
// ──────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import { defaultEditState, LIGHT, COLOR, DETAIL, type EditState, type CurvePoint } from "@/lib/editor/types";
import { composeFilter } from "@/lib/editor/preview";
import { curveTables } from "@/lib/editor/curves";
import { ImageStage } from "./parts/ImageStage";
import { PresetStrip } from "./parts/PresetStrip";
import { SliderSection } from "./parts/SliderSection";
import { AccordionSection } from "./parts/AccordionSection";
import { HslMixer, type HslMode } from "./parts/HslMixer";
import { CurveEditor } from "./parts/CurveEditor";
import { ExportSheet } from "./parts/ExportSheet";
import { AskBar } from "./parts/AskBar";
import { keywordCommand, applyCommand, isEmptyCommand, type EditCommand } from "@/lib/editor/commands";

type Channel = "rgb" | "r" | "g" | "b";

export interface EditorClientProps {
  cert: string;
  imageUrl: string; // anteprima watermarkata (/api/content/[cert])
  alias: string;
  category: string | null;
  initialState: EditState;
}

export function EditorClient({ cert, imageUrl, alias, initialState }: EditorClientProps) {
  const [state, setState] = useState<EditState>(initialState);
  const [comparing, setComparing] = useState(false);
  // Accordion: una sezione aperta alla volta (Luce di default).
  const [openSection, setOpenSection] = useState<string | null>("luce");
  const [exportOpen, setExportOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [askHint, setAskHint] = useState<string | null>(null);

  const preview = composeFilter(state);
  const tables = curveTables(state.curves);

  const setLight = (k: string, v: number) => setState((s) => ({ ...s, light: { ...s.light, [k]: v } }));
  const setColor = (k: string, v: number) => setState((s) => ({ ...s, color: { ...s.color, [k]: v } }));
  const setDetail = (k: string, v: number) => setState((s) => ({ ...s, detail: { ...s.detail, [k]: v } }));
  const setHsl = (mode: HslMode, k: string, v: number) =>
    setState((s) => ({ ...s, hsl: { ...s.hsl, [mode]: { ...s.hsl[mode], [k]: v } } }));
  const setCurve = (channel: Channel, points: CurvePoint[]) =>
    setState((s) => ({ ...s, curves: { ...s.curves, [channel]: points } }));
  const resetCurve = (channel: Channel) =>
    setState((s) => ({ ...s, curves: { ...s.curves, [channel]: [[0, 0], [100, 100]] as CurvePoint[] } }));
  const toggle = (id: string) => setOpenSection((o) => (o === id ? null : id));
  const reset = () => setState(defaultEditState());

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Scarica l'immagine MODIFICATA: la resa avviene server-side (/api/edit/render),
  // con upscale, formato e provenienza. Riceviamo il PNG come blob e lo salviamo.
  async function download(opts: { upscale: "2k" | "4k" | null; format: string | null }) {
    setDownloading(true);
    try {
      const res = await fetch("/api/edit/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cert, editState: state, upscale: opts.upscale, format: opts.format }),
      });
      if (!res.ok) throw new Error("render");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `semblic-edit-${cert.slice(0, 12)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch {
      flashToast("Export non riuscito, riprova");
    }
    setDownloading(false);
  }

  // Salvataggio NON distruttivo dello stato (riapribile).
  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/edit/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cert, editState: state }),
      });
      flashToast(res.ok ? "✓ Modifiche salvate" : "Salvataggio non riuscito");
    } catch {
      flashToast("Salvataggio non riuscito");
    }
    setSaving(false);
  }

  // "Dimmi cosa cambiare": prova la route Claude, poi fallback offline a parole
  // chiave; applica i delta allo stato (non distruttivo).
  async function applyAsk(text: string) {
    setAsking(true);
    setAskHint(null);
    let cmd: EditCommand | null = null;
    try {
      const res = await fetch("/api/edit/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) cmd = (await res.json()) as EditCommand;
    } catch {
      cmd = null;
    }
    if (isEmptyCommand(cmd)) cmd = keywordCommand(text);
    if (!isEmptyCommand(cmd)) {
      const applied = cmd as EditCommand;
      setState((s) => applyCommand(s, applied));
      setAskHint("Fatto");
    } else {
      setAskHint("Prova: caldo, contrasto, nitido, grana, vignetta, bianco e nero");
    }
    setAsking(false);
  }

  // Esporta: stesso contenuto in due collocazioni (barra fissa in fondo su
  // mobile, in coda alla colonna parametri su desktop). Apre lo sheet Esporta.
  const exportInner = (
    <>
      <button
        type="button"
        onClick={() => setExportOpen(true)}
        className="block w-full rounded-xl bg-[#F2A93B] px-4 py-3.5 text-center text-sm font-bold text-[#412402] shadow-[0_8px_28px_rgba(242,169,59,0.32)] transition-[filter] hover:brightness-110"
      >
        Esporta e scarica →
      </button>
      <p className="mt-1.5 text-center text-[0.62rem] leading-snug text-faint">
        Upscale, formato e download con le tue modifiche e la provenienza.
      </p>
    </>
  );

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden lg:block lg:h-auto lg:min-h-screen lg:overflow-visible">
      {/* Appbar */}
      <header className="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-obsidian/85 px-4 py-3 backdrop-blur-md lg:sticky lg:top-0">
        <Link href="/match" className="shrink-0 text-[0.8rem] text-muted transition-colors hover:text-foreground">
          ← Scena
        </Link>
        <span className="truncate text-[0.82rem] font-medium">
          Semblic Editor <span className="font-mono text-[0.66rem] text-faint">· {alias}</span>
        </span>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="shrink-0 rounded-full bg-amber px-3.5 py-1.5 text-[0.75rem] font-semibold text-[#412402] transition-[filter] hover:brightness-110 disabled:opacity-60"
        >
          {saving ? "Salvo…" : "Salva"}
        </button>
      </header>

      {/* Corpo: MOBILE = colonna ad altezza fissa, immagine FERMA in alto e
          parametri che scorrono internamente. DESKTOP = due colonne, immagine
          sticky a sinistra, parametri che scorrono con la pagina. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:flex-none lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start lg:gap-6 lg:overflow-visible lg:px-4 lg:py-5">
        {/* Immagine: mobile ferma in alto (shrink-0); desktop sticky */}
        <div className="shrink-0 px-3 pt-3 lg:px-0 lg:pt-0">
          <div className="lg:sticky lg:top-20">
            <ImageStage
              imageUrl={imageUrl}
              preview={preview}
              comparing={comparing}
              curveTables={tables}
              onCompareStart={() => setComparing(true)}
              onCompareEnd={() => setComparing(false)}
            />
          </div>
        </div>

        {/* Parametri: mobile scroll INTERNO (flex-1 + overflow-y-auto) cosi
            l'immagine sopra resta ferma; desktop flusso normale della pagina. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-4 lg:flex-none lg:overflow-visible lg:px-0 lg:pb-0">
          <PresetStrip
            imageUrl={imageUrl}
            preset={state.preset}
            intensity={state.intensity}
            onPreset={(key) => setState((s) => ({ ...s, preset: key }))}
            onIntensity={(v) => setState((s) => ({ ...s, intensity: v }))}
          />

          <AskBar onSubmit={applyAsk} busy={asking} hint={askHint} />

          <div className="mt-3 space-y-2">
            <SliderSection title="Luce" defs={LIGHT} values={state.light} onChange={setLight} open={openSection === "luce"} onToggle={() => toggle("luce")} />
            <SliderSection title="Colore" defs={COLOR} values={state.color} onChange={setColor} open={openSection === "colore"} onToggle={() => toggle("colore")} />
            <SliderSection title="Dettaglio ed effetti" defs={DETAIL} values={state.detail} onChange={setDetail} open={openSection === "dettaglio"} onToggle={() => toggle("dettaglio")} />
            <AccordionSection title="Mixer colore" badge="HSL" open={openSection === "mixer"} onToggle={() => toggle("mixer")}>
              <HslMixer hsl={state.hsl} onChange={setHsl} />
            </AccordionSection>
            <AccordionSection title="Curve" badge="tonale e RGB" open={openSection === "curve"} onToggle={() => toggle("curve")}>
              <CurveEditor curves={state.curves} onChange={setCurve} onReset={resetCurve} />
            </AccordionSection>
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-[0.75rem] text-muted transition-colors hover:border-amber/40 hover:text-foreground"
          >
            Azzera tutte le modifiche
          </button>

          {/* Esporta su DESKTOP: in coda alla colonna parametri */}
          <div className="mt-4 hidden lg:block">{exportInner}</div>
        </div>
      </div>

      {/* Esporta su MOBILE: barra fissa in fondo alla colonna (shrink-0) */}
      <div className="shrink-0 border-t border-border bg-obsidian/95 p-3 backdrop-blur-md lg:hidden">{exportInner}</div>

      <ExportSheet open={exportOpen} onClose={() => setExportOpen(false)} onDownload={download} downloading={downloading} cert={cert} />
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-border bg-elevated px-4 py-2 text-[0.8rem] font-medium text-foreground shadow-[0_8px_30px_rgba(0,0,0,0.5)] lg:bottom-8">
          {toast}
        </div>
      )}
    </main>
  );
}
