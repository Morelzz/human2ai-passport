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

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl">
      {/* Appbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-obsidian/85 px-4 py-3 backdrop-blur-md">
        <Link href="/match" className="shrink-0 text-[0.8rem] text-muted transition-colors hover:text-foreground">
          ← Scena
        </Link>
        <span className="truncate text-[0.82rem] font-medium">
          Semblic Editor <span className="font-mono text-[0.66rem] text-faint">· {alias}</span>
        </span>
        <button
          type="button"
          disabled
          title="Salvataggio in arrivo"
          className="shrink-0 cursor-not-allowed rounded-full bg-amber/40 px-3.5 py-1.5 text-[0.75rem] font-semibold text-[#412402]/70"
        >
          Salva
        </button>
      </header>

      {/* Corpo: mobile single-column, desktop due colonne (immagine sticky sx) */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start lg:gap-6 lg:px-4 lg:py-5">
        {/* Immagine */}
        <div className="px-3 pt-3 lg:px-0 lg:pt-0">
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

        {/* Parametri (pb extra su mobile per non finire sotto la barra Esporta fissa) */}
        <div className="px-3 pb-32 pt-4 lg:px-0 lg:pb-0">
          <PresetStrip
            imageUrl={imageUrl}
            preset={state.preset}
            intensity={state.intensity}
            onPreset={(key) => setState((s) => ({ ...s, preset: key }))}
            onIntensity={(v) => setState((s) => ({ ...s, intensity: v }))}
          />

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

          {/* Barra Esporta: fissa in fondo su mobile, in colonna su desktop */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-obsidian/95 p-3 backdrop-blur-md lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <a
              href={`/api/content/${cert}`}
              className="block w-full rounded-xl bg-[#F2A93B] px-4 py-3.5 text-center text-sm font-bold text-[#412402] shadow-[0_8px_28px_rgba(242,169,59,0.32)] transition-[filter] hover:brightness-110"
            >
              Esporta e scarica →
            </a>
            <p className="mt-1.5 text-center text-[0.62rem] leading-snug text-faint">
              Per ora scarica l&apos;originale certificato. Le modifiche entreranno nell&apos;export alla prossima fase.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
