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
import type { FramingVal, ExpressionVal, LightVal, ColorStyleVal, LensVal, CameraVal, GoalPreset } from "@/lib/studio-options";
import { GoalStart } from "./GoalStart";
import { DictateButton } from "@/components/voice/DictateButton";
import { joinScene } from "@/lib/voice/dictation";
import { AvatarHero } from "./AvatarHero";
import { PosePicker } from "./PosePicker";
import { IconPicker } from "./IconPicker";
import { ColorStyleRow } from "./ColorStyleRow";
import { PhotographicLook } from "./PhotographicLook";
import { FinalPrompt } from "./FinalPrompt";

const FMT_VOLT = new Intl.NumberFormat("it-IT");

// Avatar trovato dal matching (stessa forma di MatchClient.MatchAvatar).
export interface StudioAvatar {
  handle: string;
  alias: string;
  portrait_url: string | null;
  tier: Tier;
  reasons: string[];
  gallery_count: number;
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

// Immagine extra ECHO (stessa forma di MatchClient.EchoRef): SOLO immagini del
// cliente. La posa è un controllo a sé (PosePicker), non vive più qui.
export type StudioEchoRef = { dataUrl: string; desc: string; role: string } | undefined;

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

  // Regia vocale: applica la descrizione (parlata o scritta) ai controlli in un
  // colpo. composedByHandle porta le etichette impostate; undoCompose ripristina.
  composeFromVoice: (handle: string) => void;
  composingHandle: string | null;
  composedByHandle: Record<string, { labels: string[] } | null>;
  undoCompose: (handle: string) => void;

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
  expression: ExpressionVal;
  setExpression: (v: ExpressionVal) => void;
  colorStyle: ColorStyleVal;
  setColorStyle: (v: ColorStyleVal) => void;
  camera: CameraVal;
  setCamera: (v: CameraVal) => void;
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
    composeFromVoice,
    composingHandle,
    composedByHandle,
    undoCompose,
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
          onChangeFace={() => setSelectedHandle(null)}
        />
        {/* Hairline tramonto: lo stesso filo delle altre superfici, separa l'hero dalle scelte */}
        <div aria-hidden className="mt-5 h-px" style={{ background: "linear-gradient(90deg, rgba(242,169,59,0.5), var(--hairline) 38%, transparent 80%)" }} />
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
        onChangeFace={() => setSelectedHandle(null)}
        goalLabel={goalLabel}
        onClearGoal={() => setGoal(null)}
      />
      {/* Hairline tramonto: separa l'hero dai controlli di composizione */}
      <div aria-hidden className="mt-5 h-px" style={{ background: "linear-gradient(90deg, rgba(242,169,59,0.5), var(--hairline) 38%, transparent 80%)" }} />

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

            {/* Dettatura vocale (push-to-talk): appende il parlato alla scena
                con joinScene. Su browser senza Web Speech non rende nulla. */}
            <DictateButton
              onText={(chunk) =>
                setSceneByHandle((m) => ({ ...m, [avatar.handle]: joinScene(m[avatar.handle] ?? "", chunk) }))
              }
            />

            {/* Regia: dalla descrizione (parlata o scritta) imposta posa,
                inquadratura, espressione, stile, macchina, ottica e luce in un
                colpo. I controlli restano modificabili a mano sotto; la scena
                resta come l'ha scritta l'utente. */}
            <button
              type="button"
              onClick={() => composeFromVoice(avatar.handle)}
              disabled={composingHandle === avatar.handle || !(sceneByHandle[avatar.handle] ?? "").trim()}
              className="mt-2.5 w-full rounded-xl border border-amber/30 bg-amber/[0.07] px-3 py-2.5 text-[0.8rem] font-semibold text-amber transition-colors hover:bg-amber/15 disabled:opacity-40"
            >
              {composingHandle === avatar.handle ? "✦ Compongo lo Studio…" : "✦ Imposta lo Studio dalla descrizione"}
            </button>
            {composedByHandle[avatar.handle] && (
              <div className="mt-2 flex items-start justify-between gap-3 rounded-xl border border-teal/30 bg-teal/[0.07] p-3">
                <p className="text-[0.75rem] leading-relaxed text-foreground">
                  <span className="font-semibold text-teal">Regia impostata:</span> {composedByHandle[avatar.handle]!.labels.join(" · ")}
                </p>
                <button
                  type="button"
                  onClick={() => undoCompose(avatar.handle)}
                  className="focus-ring shrink-0 text-[0.72rem] font-semibold text-muted underline transition-colors hover:text-foreground"
                >
                  Annulla
                </button>
              </div>
            )}

            <p className="mt-2 text-[0.7rem] leading-relaxed text-faint">
              Scena libera: azione, ambientazione, luce, stile. Il volto resta {avatar.alias}, identità bloccata dalle sue foto reali.
            </p>
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
          <IconPicker label="Espressione" sheetTitle="Scegli l'espressione" options={EXPRESSIONS} value={expression} onChange={(v) => setExpression(v as ExpressionVal)} />

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
            onCamera={(v) => setCamera(v as CameraVal)}
            onLens={(v) => setLens(v as LensVal)}
            onLight={(v) => setLight(v as LightVal)}
          />

          {/* Motore e formato (restyle Task 11): il motore NON e' un toggle ma una
              chip fissa "ECHO fotoreale · identita bloccata" (.enginechip del
              prototipo). Formato/risoluzione/qualita' restano (logica invariata),
              ma lo stato attivo passa ad AMBER, unico colore d'azione SEMBLIC. */}
          {engine === "echo" && (
            <div className="mt-5 space-y-3">
              <span className="block text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-amber">Motore e formato</span>
              {/* Motore fisso: identita bloccata, nessuna scelta di modello. */}
              <span className="inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-3 py-1.5 text-xs font-medium text-amber">
                <span aria-hidden>◉</span> ECHO fotoreale
                <span className="text-[0.65rem] font-normal text-muted">identità bloccata</span>
              </span>
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

          {/* Immagini di riferimento (Task 10): SOLO immagini del cliente, fino a
              2 slot. La posa NON vive più qui (è il PosePicker indipendente).
              Struttura/etichette dal prototipo design/anteprima_match_mobile.html
              (.blk "Immagini di riferimento"): label amber + hint ".opt" «fino a
              2», la nota amber «Un solo outfit per generazione», e 2 .ref con
              thumbnail + ruolo (select) + come si usa (input). Vincolo singolo
              outfit: se uno slot è "outfit", l'altro non offre più "Outfit". */}
          {engine === "echo" && (
            <div className="mt-4">
              <span className="mb-2 flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-amber">
                Immagini di riferimento <span className="font-normal normal-case tracking-normal text-faint">· fino a 2</span>
              </span>
              <p className="mb-2 rounded-lg border border-amber/30 bg-amber/10 px-2.5 py-2 text-[0.66rem] leading-snug text-amber">
                <span aria-hidden>⚠️</span> Un solo outfit per generazione
              </p>
              <div className="space-y-2">
                {[0, 1].map((i) => {
                  const ref = echoRefs[i];
                  // Vincolo "un solo outfit": se l'ALTRO slot è già "outfit",
                  // questo slot non può scegliere "outfit" (opzione nascosta). Se
                  // questo slot fosse rimasto su "outfit", lo si riallinea.
                  const other = echoRefs[i === 0 ? 1 : 0];
                  const outfitTakenElsewhere = other?.role === "outfit";
                  return (
                    <div key={i} className="rounded-xl border border-border bg-obsidian-2 p-2.5">
                      {ref?.dataUrl ? (
                        <div className="flex gap-2.5">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-obsidian">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={ref.dataUrl} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeEcho(i)}
                              aria-label="Rimuovi"
                              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[0.6rem] text-white hover:bg-black/80"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex flex-1 flex-col gap-1.5">
                            <select
                              value={ref.role}
                              onChange={(e) => updateEcho(i, { role: e.target.value })}
                              className="w-full rounded-lg border border-border bg-obsidian px-2.5 py-2 text-xs text-foreground outline-none focus:border-amber/40"
                            >
                              {/* "Outfit" disponibile solo se l'altro slot non lo è
                                  già; resta selezionabile se è questo slot ad averlo. */}
                              {(!outfitTakenElsewhere || ref.role === "outfit") && (
                                <option value="outfit">Outfit / capo</option>
                              )}
                              <option value="accessorio">Accessorio</option>
                              <option value="sfondo">Sfondo / scenario</option>
                              <option value="oggetto">Oggetto</option>
                            </select>
                            <input
                              value={ref.desc}
                              onChange={(e) => updateEcho(i, { desc: e.target.value })}
                              placeholder="come si usa (opzionale)"
                              className="w-full rounded-lg border border-border bg-obsidian px-2.5 py-2 text-xs text-foreground outline-none focus:border-amber/40"
                            />
                          </div>
                        </div>
                      ) : (
                        <label className="focus-ring flex h-16 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center text-faint transition-colors hover:border-amber/40 hover:text-amber">
                          <span className="text-xl leading-none">+</span>
                          <span className="text-[0.7rem] leading-tight">{i === 0 ? "Outfit / capo" : "Scenario / altro"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            aria-label={i === 0 ? "Carica un outfit o un capo" : "Carica uno scenario o altro"}
                            className="sr-only"
                            onChange={(e) => { pickEcho(i, e.target.files?.[0]); e.currentTarget.value = ""; }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[0.68rem] leading-relaxed text-faint">
                Carica le immagini e scegli <span className="text-muted">cosa sono</span>: al collegamento pensiamo noi.
                Es. outfit + sfondo, {avatar.alias} indossa quell&apos;outfit in quell&apos;ambiente, automaticamente.
                Il campo «scena» sopra è solo per direzioni extra (luce, espressione) ed è opzionale.
              </p>
            </div>
          )}

          {/* Prompt finale (Task 11): anteprima READ-ONLY, subito prima del
              bottone Genera. Ricompone client-side, nello stesso ordine del
              server (lib/echo-prompt), cio' che ECHO ricevera': scena +
              posa + clausole riferimenti + segmento fotografico + nota di
              sistema. Usa i token-helper di studio-options: sempre fedele. */}

          {/* Migliora prompt: SPOSTATO in fondo (penultimo, prima del prompt
              finale e di Genera). Cosi l'enhancer ha gia davanti tutte le scelte
              fatte coi controlli (posa, inquadratura, espressione, stile, look,
              riferimenti) e migliora SOLO la scena rafforzandole, senza aggiungere
              direttive fotografiche che andrebbero in conflitto coi pulsanti. */}
          <div className="mt-5">
            <button
              type="button"
              onClick={() => enhance(avatar.handle)}
              disabled={enhancingHandle === avatar.handle || !(sceneByHandle[avatar.handle] ?? "").trim()}
              className="w-full rounded-xl border border-amber/30 bg-amber/10 px-3 py-2.5 text-[0.8rem] font-semibold text-amber transition-colors hover:bg-amber/20 disabled:opacity-40"
            >
              {enhancingHandle === avatar.handle ? "✦ Miglioro la scena…" : "✦ Migliora prompt"}
            </button>
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
          </div>

          <FinalPrompt
            scene={sceneByHandle[avatar.handle] ?? ""}
            pose={pose}
            framing={framing}
            expression={expression}
            colorStyle={colorStyle}
            camera={camera}
            lens={lens}
            light={light}
            refs={echoRefs}
          />

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
          {/* CTA verso il Semblic Editor (non un redirect forzato: la
              generazione e async, la gente edita anche dopo, da /account). */}
          {gen.certificate && (
            <a href={`/studio/edit/${gen.certificate}`} className="mb-4 block w-full rounded-xl bg-[#F2A93B] px-4 py-3 text-center text-sm font-bold text-[#412402] shadow-[0_8px_28px_rgba(242,169,59,0.3)] transition-[filter] hover:brightness-110">
              ✦ Modifica con Semblic Editor
            </a>
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

// Chip e EuroRow: copie locali (presentazionali, nessuno stato). La Chip qui
// serve SOLO ai selettori ECHO (formato/risoluzione/qualita'): lo stato attivo
// e' AMBER, unico colore d'azione SEMBLIC, in linea coi chip posa/look (mai
// violet). Tenute qui per non dover esportare/riorganizzare MatchClient.
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`focus-ring rounded-full px-3.5 py-2 text-sm font-semibold transition-all ${
        active ? "border border-amber bg-amber/10 text-amber" : "border border-border bg-obsidian-2 text-muted hover:text-foreground"
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
