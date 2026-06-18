"use client";

// ──────────────────────────────────────────────────────────────────────────
// StudioPanel — area di GENERAZIONE per UN avatar selezionato.
// Estratto da MatchClient (Task 5 dello Studio): qui vive SOLO il rendering del
// pannello di generazione (scena + enhancer + controlli ECHO + immagini di
// riferimento + posa da libreria + bottone Genera + vista risultato).
// TUTTA la logica (generate, pollJob, enhance, handler echoRefs, gate VOLT,
// risultato) resta in MatchClient e arriva qui via props tipizzate: il
// rendering e' IDENTICO a prima, solo rilocato.
// ECHO (gpt-image-2) e' l'unico motore: nessun model/styleId/HUMAN/SHAPE.
// ──────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { TIER_CONFIG, Tier } from "@/lib/types";
import { formatEur } from "@/lib/wallet";
import { echoResLabel } from "@/lib/engines/echo-cost";
import { avatarArt } from "@/lib/avatar-art";
import { ShareStoryButton } from "@/components/share/ShareStoryButton";
import { voltStr } from "@/lib/strings/volt";
// Tipi delle nuove selezioni dello Studio: il segmento fotografico (Task
// successivi) usera' i tipi letterali derivati dai cataloghi di studio-options.
import { GOALS, FRAMINGS, EXPRESSIONS } from "@/lib/studio-options";
import type { FramingVal, LightVal, ColorStyleVal, LensVal, GoalPreset } from "@/lib/studio-options";
import { GoalStart } from "./GoalStart";
import { AvatarHero } from "./AvatarHero";
import { PosePicker } from "./PosePicker";
import { IconPicker } from "./IconPicker";
import { ColorStyleRow } from "./ColorStyleRow";
import { PhotographicLook } from "./PhotographicLook";

const FMT_VOLT = new Intl.NumberFormat("it-IT");

// Avatar trovato dal matching (stessa forma di MatchClient.MatchAvatar).
export interface StudioAvatar {
  handle: string;
  alias: string;
  portrait_url: string | null;
  tier: Tier;
  reasons: string[];
  gallery_count: number;
  approved_categories: string[];
  excluded_categories: string[];
}

// Risultato di una generazione (stessa forma di MatchClient.GenResult).
export interface StudioGenResult {
  mode: "preview" | "commercial";
  alias: string;
  image_url?: string;
  image_data?: string;
  certificate?: string;
  category?: string | null;
  gross_cents?: number;
  fee_cents?: number;
  royalty_cents?: number;
  surcharge_cents?: number;
  size?: string;
  volt?: { spent: number; balance: number | null };
  voltMission?: string | null;
}

// Immagine extra ECHO (stessa forma di MatchClient.EchoRef).
export type StudioEchoRef = { dataUrl: string; desc: string; role: string; poseId?: string } | undefined;

export interface StudioPanelProps {
  // L'avatar di questa card + contesto della ricerca.
  avatar: StudioAvatar;
  category: string | null;

  // Reset della selezione (usato dall'hero "Cambia volto").
  setSelectedHandle: (h: string | null) => void;

  // Stato di generazione, posseduto da MatchClient.
  gen: StudioGenResult | undefined;
  generating: boolean;
  loadingLine: string;

  // Scena (prompt) per handle + enhancer (proposta migliorata).
  sceneByHandle: Record<string, string>;
  setSceneByHandle: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  enhance: (handle: string) => void;
  enhancingHandle: string | null;
  enhancedByHandle: Record<string, string | null>;
  setEnhancedByHandle: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;

  // Guardia fotorealismo: termini non-reali rilevati nella scena corrente.
  styleRisk: string[];

  // Motore: SEMPRE "echo" (nessun toggle). Tenuto come prop per coerenza col chiamante.
  engine: "echo";

  // Controlli ECHO (formato/risoluzione/qualita') + derivati di prezzo.
  echoFormat: string;
  setEchoFormat: (v: string) => void;
  echoRes: string;
  setEchoRes: (v: string) => void;
  echoQuality: string;
  setEchoQuality: (v: string) => void;
  echoSize: string;
  echoSurcharge: number;
  echoFormats: { v: string; l: string }[];
  echoReses: { v: string; l: string }[];
  echoQuals: { v: string; l: string }[];

  // Immagini di riferimento ECHO + handler (logica in MatchClient).
  echoRefs: StudioEchoRef[];
  pickEcho: (i: number, file: File | undefined) => void;
  updateEcho: (i: number, patch: Partial<NonNullable<StudioEchoRef>>) => void;
  removeEcho: (i: number) => void;

  // Posa dalla libreria.
  poseLib: { id: string; label: string; url: string }[] | null;
  poseOpenFor: number | null;
  setPoseOpenFor: (v: number | null) => void;
  pickPose: (i: number, pose: { id: string; label: string; url: string }) => void;
  poseChosen: boolean;

  // Azioni + gate VOLT (tutto posseduto da MatchClient).
  generate: (handle: string, mode: "preview" | "commercial") => void;
  resetGeneration: (handle: string) => void;
  voltBalance: number | null;
  priceCents: number;
  genCta: string;
  voltGatePanel: React.ReactNode;

  // ── Nuove selezioni dello Studio (usato dai task successivi) ──────────────
  // Dichiarate ora e passate qui per "uso": il wiring nel prompt (segmento
  // fotografico via lib/studio-options) arriva nei task successivi.
  goal: string | null;
  setGoal: (v: string | null) => void;
  pose: string;
  setPose: (v: string) => void;
  framing: FramingVal;
  setFraming: (v: FramingVal) => void;
  expression: string;
  setExpression: (v: string) => void;
  colorStyle: ColorStyleVal;
  setColorStyle: (v: ColorStyleVal) => void;
  camera: string;
  setCamera: (v: string) => void;
  lens: LensVal;
  setLens: (v: LensVal) => void;
  light: LightVal;
  setLight: (v: LightVal) => void;
}

export function StudioPanel(props: StudioPanelProps) {
  const {
    avatar,
    category,
    setSelectedHandle,
    gen,
    generating,
    loadingLine,
    sceneByHandle,
    setSceneByHandle,
    enhance,
    enhancingHandle,
    enhancedByHandle,
    setEnhancedByHandle,
    styleRisk,
    engine,
    echoFormat,
    setEchoFormat,
    echoRes,
    setEchoRes,
    echoQuality,
    setEchoQuality,
    echoSize,
    echoSurcharge,
    echoFormats,
    echoReses,
    echoQuals,
    echoRefs,
    pickEcho,
    updateEcho,
    removeEcho,
    poseLib,
    poseOpenFor,
    setPoseOpenFor,
    pickPose,
    poseChosen,
    generate,
    resetGeneration,
    voltBalance,
    priceCents,
    genCta,
    voltGatePanel,
    // Nuove selezioni: destrutturate (= "usate") per i task successivi.
    // usato dai task successivi
    goal, setGoal, pose, setPose, framing, setFraming, expression, setExpression,
    colorStyle, setColorStyle, camera, setCamera, lens, setLens, light, setLight,
  } = props;

  // Tutte le selezioni dello Studio (posa, inquadratura, espressione, stile
  // colore, macchina, ottica, luce) hanno ora un controllo dedicato: nessuna
  // resta inutilizzata. L'invio al prompt /api/generate arriva in un task
  // successivo (questo task aggiunge solo la UI di selezione).

  // Avvio per obiettivo: applica i preset del GoalPreset scelto (formato,
  // inquadratura, luce, stile colore, ottica) e poi entra in composizione
  // settando goal. "Scena libera" (libera) non ha campi: setta solo goal.
  // Sorgente di verita dei preset: lib/studio-options.ts (GOALS).
  function applyGoal(g: string) {
    // GOALS e' "as const": il membro "libera" non ha i campi opzionali, quindi
    // tipizziamo il risultato come GoalPreset (che li ha tutti opzionali).
    const preset = GOALS.find((x) => x.v === g) as GoalPreset | undefined;
    if (preset) {
      if (preset.format) setEchoFormat(preset.format);
      if (preset.framing) setFraming(preset.framing);
      if (preset.light) setLight(preset.light);
      if (preset.colorStyle) setColorStyle(preset.colorStyle);
      if (preset.lens) setLens(preset.lens);
    }
    setGoal(g);
  }
  // Etichetta dell'obiettivo corrente (per la goalpill nell'hero).
  const goalLabel = goal ? (GOALS.find((x) => x.v === goal)?.l ?? null) : null;

  // Stato "in lavorazione" mostrato durante la generazione (con copy
  // ECHO-aware: la generazione async puo' durare minuti).
  const inProgress = generating ? (
    <div className="mt-3 flex items-start gap-3 rounded-xl border border-violet/30 bg-violet/10 p-4">
      <span className="mt-0.5 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-violet-light border-t-transparent" aria-hidden />
      <div className="text-[0.8rem] leading-relaxed text-foreground">
        <span className="font-semibold">Generazione in corso…</span>
        {engine === "echo" ? " ECHO lavora alla massima fedeltà: può richiedere 1-3 minuti." : ""}
        <br />
        <span className="text-faint">Puoi restare qui o tornare dopo: la trovi in <Link href="/account" className="text-violet-light underline">I miei contenuti</Link>.</span>
      </div>
    </div>
  ) : null;

  const tier = TIER_CONFIG[avatar.tier];
  // Regola unica: avatar con galleria -> ritratto reale via route interna.
  const portrait = (avatar.gallery_count ?? 0) > 0 ? `/api/sample/${avatar.handle}/0` : avatarArt(avatar.handle, avatar.alias);

  // Schermata di avvio per obiettivo: finche' l'utente non sceglie un obiettivo
  // (goal === null) mostriamo l'hero del volto + GoalStart e NON la composizione.
  if (goal === null) {
    return (
      <div className="glass rounded-2xl border-teal/25 p-6">
        <AvatarHero
          alias={avatar.alias}
          handle={avatar.handle}
          portrait={portrait}
          tierLabel={tier.label}
          category={category}
          approvedCategories={avatar.approved_categories}
          excludedCategories={avatar.excluded_categories}
          onChangeFace={() => setSelectedHandle(null)}
        />
        <GoalStart alias={avatar.alias} onPick={applyGoal} />
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border-teal/25 p-6">
      <AvatarHero
        alias={avatar.alias}
        handle={avatar.handle}
        portrait={portrait}
        tierLabel={tier.label}
        category={category}
        approvedCategories={avatar.approved_categories}
        excludedCategories={avatar.excluded_categories}
        onChangeFace={() => setSelectedHandle(null)}
        goalLabel={goalLabel}
        onClearGoal={() => setGoal(null)}
      />

      {!gen ? (
        <>
          {/* Blocco "La scena" (Task 7): primo controllo sotto l'hero in composizione.
              Struttura/etichette dal prototipo design/anteprima_match_mobile.html
              (.blk "La scena"), tradotto nei token dell'app: label amber, textarea
              su superficie input, enhancer in tinta amber, proposta con azioni
              salvia "Usa questa" / neutra "Tieni la mia". */}
          <div className="mt-5">
            <span className="mb-2 block text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-amber">La scena</span>
            <textarea
              value={sceneByHandle[avatar.handle] ?? ""}
              onChange={(e) => setSceneByHandle((m) => ({ ...m, [avatar.handle]: e.target.value }))}
              placeholder="Es. che balla in spiaggia al tramonto, luce dorata, look estivo, 35mm"
              rows={2}
              className="w-full resize-y rounded-xl border border-border bg-obsidian-2 px-3 py-3 text-sm leading-relaxed text-foreground outline-none focus:border-amber/40"
            />

            {/* A1 — Prompt Enhancer: mai automatico, parte solo da qui */}
            <button
              type="button"
              onClick={() => enhance(avatar.handle)}
              disabled={enhancingHandle === avatar.handle || !(sceneByHandle[avatar.handle] ?? "").trim()}
              className="mt-2 w-full rounded-xl border border-amber/30 bg-amber/10 px-3 py-2.5 text-[0.8rem] font-semibold text-amber transition-colors hover:bg-amber/20 disabled:opacity-40"
            >
              {enhancingHandle === avatar.handle ? "✦ Miglioro…" : "✦ Migliora prompt"}
            </button>
            <p className="mt-2 text-[0.7rem] leading-relaxed text-faint">
              Scena libera: azione, ambientazione, luce, stile. Il volto resta {avatar.alias}, identità bloccata dalle sue foto reali.
            </p>

            {/* Proposta migliorata: tag "Proposta", testo suggerito e due azioni
                (Usa questa / Tieni la mia). Modificabile dopo l'uso. */}
            {enhancedByHandle[avatar.handle] && (
              <div className="mt-2.5 rounded-xl border border-amber/30 bg-amber/[0.07] p-3">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-amber">Proposta</span>
                <p className="mt-1.5 text-[0.82rem] leading-relaxed text-foreground">{enhancedByHandle[avatar.handle]}</p>
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSceneByHandle((m) => ({ ...m, [avatar.handle]: enhancedByHandle[avatar.handle] ?? "" }));
                      setEnhancedByHandle((m) => ({ ...m, [avatar.handle]: null }));
                    }}
                    className="flex-1 rounded-lg border border-teal/40 bg-teal/10 px-3 py-2 text-center text-[0.75rem] font-semibold text-teal transition-colors hover:bg-teal/20"
                  >
                    Usa questa
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnhancedByHandle((m) => ({ ...m, [avatar.handle]: null }))}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-[0.75rem] font-semibold text-muted transition-colors hover:bg-white/5"
                  >
                    Tieni la mia
                  </button>
                </div>
              </div>
            )}
            {styleRisk.length > 0 && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber/40 bg-amber/10 p-3 text-[0.72rem] leading-relaxed text-amber">
                <span aria-hidden>⚠️</span>
                <span>
                  ECHO è <span className="font-semibold">fotorealistico</span>: «{styleRisk.join("», «")}» può far perdere l&apos;identità reale di {avatar.alias} (e spendere una generazione per un risultato fuori target). Per la massima fedeltà descrivi una <span className="font-semibold">scena reale</span>: luogo, luce, abbigliamento, posa.
                </span>
              </div>
            )}
          </div>

          {/* Composizione (Task 8): tre selettori sotto "La scena", nell'ordine
              del prototipo (Posa, Inquadratura, Espressione). Posa apre un bottom
              sheet con le pose per categoria; inquadratura ed espressione usano
              lo stesso pattern campo + foglio (IconPicker riutilizzabile). I
              valori scrivono su pose/framing/expression (gia' threadati via props).
              L'invio al prompt /api/generate arriva in un task successivo. */}
          <PosePicker value={pose} onChange={setPose} />
          <IconPicker label="Inquadratura" sheetTitle="Scegli l'inquadratura" options={FRAMINGS} value={framing} onChange={(v) => setFraming(v as FramingVal)} />
          <IconPicker label="Espressione" sheetTitle="Scegli l'espressione" options={EXPRESSIONS} value={expression} onChange={setExpression} />

          {/* Stile colore + Look fotografico (Task 9): dopo l'Espressione, nello
              stesso ordine del prototipo. Stile colore = chip con campione di
              colore; Look fotografico = Macchina (2x2) + Ottica (mm) + Luce.
              Scrivono su colorStyle/camera/lens/light (gia' threadati via props);
              i tipi letterali si applicano col cast sui setter dedicati. */}
          <ColorStyleRow value={colorStyle} onChange={(v) => setColorStyle(v as ColorStyleVal)} />
          <PhotographicLook
            camera={camera}
            lens={lens}
            light={light}
            onCamera={setCamera}
            onLens={(v) => setLens(v as LensVal)}
            onLight={(v) => setLight(v as LightVal)}
          />

          <p className="mt-5 font-mono text-[0.7rem] tracking-wide text-teal/90">
            <span className="text-faint">[</span> IDENTITÀ VERIFICATA <span className="text-faint">]</span>{" "}
            <span className="text-faint">affinità: {avatar.reasons.join(" · ")}</span>
          </p>

          {avatar.gallery_count > 0 && (
            <div className="mt-5">
              <span className="mb-2 block text-xs font-semibold text-muted">
                Repertorio <span className="font-normal text-faint">· esempi generati da questo volto</span>
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {Array.from({ length: avatar.gallery_count }).map((_, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={`/api/sample/${avatar.handle}/${i}`} alt={`esempio ${i + 1}`} loading="lazy"
                    className="h-[150px] w-[112px] shrink-0 rounded-lg border border-border bg-obsidian-3 object-cover" />
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <p className="text-[0.7rem] leading-relaxed text-teal">
              Motore ECHO · massima fedeltà: l&apos;identità è bloccata dalle foto reali della persona.
            </p>
          </div>

          {/* ECHO — formato, risoluzione e qualità (incidono sul prezzo) */}
          {engine === "echo" && (
            <div className="mt-4 space-y-3">
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-muted">Formato</span>
                <div className="flex flex-wrap gap-2">
                  {echoFormats.map((f) => (
                    <Chip key={f.v} active={echoFormat === f.v}
                      onClick={() => { setEchoFormat(f.v); if (f.v === "quadrato" && echoRes === "4k") setEchoRes("2k"); }}>
                      {f.l}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-muted">Risoluzione</span>
                <div className="flex flex-wrap gap-2">
                  {echoReses.filter((r) => !(echoFormat === "quadrato" && r.v === "4k")).map((r) => (
                    <Chip key={r.v} active={echoRes === r.v} onClick={() => setEchoRes(r.v)}>{r.l}</Chip>
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-muted">Qualità</span>
                <div className="flex flex-wrap gap-2">
                  {echoQuals.map((q) => (
                    <Chip key={q.v} active={echoQuality === q.v} onClick={() => setEchoQuality(q.v)}>{q.l}</Chip>
                  ))}
                </div>
              </div>
              <p className="text-[0.66rem] leading-relaxed text-faint">
                {echoSize.replace("x", "×")} px · supplemento compute {formatEur(echoSurcharge)}{echoRes !== "standard" ? " · più lento (anche qualche minuto)" : ""}
              </p>
            </div>
          )}

          {/* ECHO — fino a 2 immagini extra del cliente (outfit, scenario…) */}
          {engine === "echo" && (
            <div className="mt-4">
              <span className="mb-2 block text-xs font-semibold text-muted">
                Capi e scenari <span className="font-normal text-faint">· opzionale, fino a 2</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[0, 1].map((i) => {
                  const ref = echoRefs[i];
                  return (
                    <div key={i} className="rounded-xl border border-border bg-obsidian p-2">
                      {ref?.dataUrl ? (
                        <>
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={ref.dataUrl} alt="" className={`h-24 w-full rounded-lg ${ref.poseId ? "object-contain bg-white/[0.04]" : "object-cover"}`} />
                            <button
                              type="button"
                              onClick={() => removeEcho(i)}
                              aria-label="Rimuovi"
                              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
                            >
                              ✕
                            </button>
                          </div>
                          {ref.poseId ? (
                            <p className="mt-2 truncate text-xs text-teal">Posa · {ref.desc}</p>
                          ) : (
                            <>
                              <select
                                value={ref.role}
                                onChange={(e) => updateEcho(i, { role: e.target.value })}
                                className="mt-2 w-full rounded-lg border border-border bg-obsidian-2 px-2 py-1.5 text-xs text-foreground outline-none focus:border-teal/50"
                              >
                                <option value="outfit">Outfit / capo</option>
                                <option value="accessorio">Accessorio</option>
                                <option value="sfondo">Sfondo / scenario</option>
                                <option value="oggetto">Oggetto</option>
                              </select>
                              <input
                                value={ref.desc}
                                onChange={(e) => updateEcho(i, { desc: e.target.value })}
                                placeholder="descrizione (opzionale)"
                                className="mt-1.5 w-full rounded-lg border border-border bg-obsidian-2 px-2.5 py-2 text-xs text-foreground outline-none focus:border-teal/50"
                              />
                            </>
                          )}
                        </>
                      ) : (
                        <div className="flex h-[124px] flex-col gap-1.5">
                          <label className="focus-ring flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-center text-faint transition-colors hover:border-teal/40 hover:text-teal">
                            <span className="text-xl leading-none">+</span>
                            <span className="px-2 text-[0.66rem] leading-tight">{i === 0 ? "Outfit / capo" : "Scenario / altro"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              aria-label={i === 0 ? "Carica un outfit o un capo" : "Carica uno scenario o altro"}
                              className="sr-only"
                              onChange={(e) => { pickEcho(i, e.target.files?.[0]); e.currentTarget.value = ""; }}
                            />
                          </label>
                          {!poseChosen && (poseLib?.length ?? 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => setPoseOpenFor(poseOpenFor === i ? null : i)}
                              aria-expanded={poseOpenFor === i}
                              className={`focus-ring rounded-lg border px-2 py-1.5 text-[0.66rem] transition-colors ${poseOpenFor === i ? "border-teal/50 text-teal" : "border-border text-faint hover:border-teal/40 hover:text-teal"}`}
                            >
                              🧍 Posa dalla libreria
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {poseOpenFor !== null && !poseChosen && (
                <div className="mt-2 rounded-xl border border-border bg-obsidian p-2">
                  <p className="mb-2 px-1 text-[0.66rem] text-faint">Scegli la posa: il manichino guida SOLO il corpo, l&apos;identità resta della persona.</p>
                  <div className="grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto">
                    {(poseLib ?? []).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => pickPose(poseOpenFor, p)}
                        className="focus-ring group rounded-lg border border-border bg-white/[0.03] p-1 text-left transition-colors hover:border-teal/50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={p.label} className="h-16 w-full rounded object-contain" loading="lazy" />
                        <span className="mt-1 block truncate px-0.5 text-[0.6rem] text-faint group-hover:text-teal">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-2 text-[0.68rem] leading-relaxed text-faint">
                Carica le immagini e scegli <span className="text-muted">cosa sono</span>: al collegamento pensiamo noi.
                Es. outfit + sfondo → {avatar.alias} indossa quell&apos;outfit in quell&apos;ambiente, automaticamente.
                Il campo &laquo;scena&raquo; sopra è solo per direzioni extra (luce, espressione) ed è opzionale.
              </p>
            </div>
          )}


          {voltBalance !== null && voltBalance >= priceCents && (
            <p className="mt-4 text-center text-[0.7rem] text-faint">
              {voltStr("gen.cost.preview", { n: FMT_VOLT.format(priceCents), saldo: FMT_VOLT.format(voltBalance - priceCents) })}
            </p>
          )}
          <button onClick={() => generate(avatar.handle, "commercial")} disabled={generating}
            className="mt-2 w-full rounded-xl bg-[#F2A93B] px-6 py-3 text-sm font-bold text-[#412402] shadow-[0_8px_40px_rgba(242,169,59,0.35)] transition-all hover:brightness-110 disabled:opacity-50">
            {generating ? loadingLine : genCta}
          </button>
          {voltGatePanel}
          {inProgress}
          <p className="mt-2 text-[0.7rem] leading-relaxed text-faint">Output pulito, full-res, con certificato e royalty a {avatar.alias}.</p>
          <Link href={`/passport/${avatar.handle}`} className="mt-3 block rounded-xl border border-violet/30 bg-violet/10 px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-violet/20">
            Vedi il passport →
          </Link>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-teal/25 bg-obsidian p-5">
          <p className="mb-1 text-sm font-bold text-teal">✓ Generazione certificata</p>
          {gen.volt && (
            <p className="mb-1 text-[0.72rem] font-semibold text-foreground">
              {voltStr("gen.success.body", { n: FMT_VOLT.format(gen.volt.spent), saldo: gen.volt.balance !== null ? FMT_VOLT.format(gen.volt.balance) : "—" })}
            </p>
          )}
          {gen.voltMission && (
            <p className="mb-1 text-[0.7rem] italic text-violet-light">{gen.voltMission}</p>
          )}
          {gen.size && (
            <p className="mb-3 text-[0.72rem] font-semibold text-violet-light">Motore ECHO · {echoResLabel(gen.size)} · {gen.size.replace("x", "×")} px</p>
          )}
          {gen.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            // Mostra la versione con filigrana invisibile (se c'è il certificato),
            // così l'immagine che l'utente vede/salva porta già il codice nascosto.
            <img src={gen.certificate ? `/api/content/${gen.certificate}` : gen.image_url} alt="output generato" className="mb-4 w-full max-w-[280px] rounded-lg border border-border bg-obsidian-3" />
          )}
          <div className="mb-4 rounded-lg bg-obsidian-2 p-4">
            <EuroRow label={`Costo generazione${gen.category ? ` (${gen.category})` : ""}`} value={formatEur(gen.gross_cents ?? 0)} dim />
            <EuroRow label="Fee piattaforma" value={`− ${formatEur((gen.fee_cents ?? 0) - (gen.surcharge_cents ?? 0))}`} dim />
            {(gen.surcharge_cents ?? 0) > 0 && (
              <EuroRow label="Supplemento compute" value={`− ${formatEur(gen.surcharge_cents ?? 0)}`} dim />
            )}
            <div className="my-2 h-px bg-white/6" />
            <EuroRow label={`Royalty a ${gen.alias}`} value={formatEur(gen.royalty_cents ?? 0)} highlight />
          </div>
          <p className="mb-1 text-[0.7rem] tracking-wide text-faint">CREDENZIALE D&apos;USCITA (hash anonimo)</p>
          <code className="mb-4 block break-all font-mono text-[0.7rem] text-violet-light">{gen.certificate}</code>
          {gen.certificate && (
            <a href={`/api/content/${gen.certificate}`} className="block rounded-xl border border-teal/30 bg-teal/10 px-4 py-3 text-center text-sm font-bold text-teal transition-colors hover:bg-teal/20">
              Scarica con provenienza →
            </a>
          )}
          {gen.certificate && (
            // Storia Instagram con cornice-certificato: la cornice è il formato,
            // non un overlay — da qui esce SOLO l'immagine certificata.
            <ShareStoryButton
              query={`cert=${encodeURIComponent(gen.certificate)}&v=buyer`}
              filename={`semblic-story-${gen.certificate.slice(0, 8)}.png`}
              label="Condividi come Storia →"
              className="mt-2 block w-full rounded-xl border border-violet/30 bg-violet/10 px-4 py-3 text-center text-sm font-bold text-violet-light transition-colors hover:bg-violet/20 disabled:opacity-50"
            />
          )}

          {/* Genera ancora: stessa scena/immagini (variante) oppure ricomincia da capo */}
          <div className="mt-4 grid gap-2 border-t border-border pt-4">
            <button onClick={() => generate(avatar.handle, "commercial")} disabled={generating}
              className="w-full rounded-xl bg-[#F2A93B] px-5 py-3 text-sm font-bold text-[#412402] transition-all hover:brightness-110 disabled:opacity-50">
              {generating ? loadingLine : `↻ ${genCta}`}
            </button>
            {voltGatePanel}
            {inProgress}
            <button onClick={() => resetGeneration(avatar.handle)} disabled={generating}
              className="w-full rounded-xl border border-border bg-white/[0.03] px-5 py-3 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-50">
              Nuova scena (cambia prompt e immagini) →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Chip e EuroRow: copie locali identiche a quelle di MatchClient (presentazionali,
// nessuno stato). Tenute qui per non dover esportare/riorganizzare MatchClient.
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`focus-ring rounded-full px-3.5 py-2 text-sm font-semibold transition-all ${
        active ? "border border-violet bg-violet/20 text-foreground" : "border border-border bg-obsidian-2 text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EuroRow({ label, value, dim, highlight }: { label: string; value: string; dim?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className={`text-sm ${dim ? "text-muted" : "text-foreground/80"}`}>{label}</span>
      <span className={highlight ? "text-base font-extrabold text-teal" : "text-sm font-semibold text-foreground/80"}>{value}</span>
    </div>
  );
}
