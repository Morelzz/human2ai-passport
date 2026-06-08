"use client";

import { useState } from "react";
import Link from "next/link";
import { TIER_CONFIG, Tier, CATEGORIES } from "@/lib/types";
import { formatEur, grossForCategory, echoMultiplier } from "@/lib/wallet";
import { SOUL_MODELS, SOUL_STYLES, DEFAULT_MODEL, SoulModel } from "@/lib/soul-models";
import { avatarArt } from "@/lib/avatar-art";

// Opzioni risoluzione/qualità per ECHO (gpt-image-2), con etichette leggibili.
const ECHO_SIZE_OPTS = [
  { v: "1024x1024", l: "Quadrata · 1024" },
  { v: "1024x1536", l: "Verticale · 1024×1536" },
  { v: "1536x1024", l: "Orizzontale · 1536×1024" },
  { v: "2560x1440", l: "2K · 2560×1440" },
  { v: "3840x2160", l: "4K · 3840×2160" },
];
const ECHO_QUALITY_OPTS = [
  { v: "low", l: "Bassa" },
  { v: "medium", l: "Media" },
  { v: "high", l: "Alta" },
];

// --- Opzioni dell'identikit (chip cliccabili) ---
const GENDERS = [
  { v: "uomo", l: "Uomo" },
  { v: "donna", l: "Donna" },
];
const HAIRS = ["Neri", "Castani", "Biondi", "Rossi", "Grigi", "Rasati", "Calvo"];
const ETHNICITIES = ["Italiana", "Giapponese", "Cinese", "Indiana", "Nigeriana", "Afroamericana", "Caucasica", "Latina", "Araba"];

interface Attrs {
  gender: string | null;
  ethnicity: string | null;
  hair_color: string | null;
  age_min: number | null;
  age_max: number | null;
}

interface MatchAvatar { handle: string; alias: string; portrait_url: string | null; tier: Tier; reasons: string[]; gallery_count: number; }

interface MatchResponse {
  matched: boolean;
  attrs: Attrs;
  category: string | null;
  reason?: string;
  results?: MatchAvatar[];
}

interface GenResult {
  mode: "preview" | "commercial";
  alias: string;
  image_url?: string;
  image_data?: string;
  certificate?: string;
  category?: string | null;
  gross_cents?: number;
  fee_cents?: number;
  royalty_cents?: number;
}

// Ridimensiona un'immagine scelta dall'utente a max 1024px e ritorna un data-URL
// JPEG: payload leggero (sotto i limiti del server) e veloce da inviare.
function resizeImage(file: File, maxDim = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src = url;
  });
}

export default function MatchClient() {
  // Passo 1 — CHI: identikit (chip) + categoria d'uso
  const [gender, setGender] = useState("");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(100);
  const [hair, setHair] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [category, setCategory] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);

  // Passo 2 — SCENA: direzione artistica libera, per ogni avatar trovato
  const [sceneByHandle, setSceneByHandle] = useState<Record<string, string>>({});
  const [generatingHandle, setGeneratingHandle] = useState<string | null>(null);
  const [genByHandle, setGenByHandle] = useState<Record<string, GenResult>>({});

  // Impostazioni di generazione: motore + modello (qualità) + stile (solo Soul ID)
  // engine 'higgsfield' = Soul (HUMAN/SHAPE); 'echo' = gpt-image-2 con identity-lock.
  const [engine, setEngine] = useState<"higgsfield" | "echo">("higgsfield");
  const [echoSize, setEchoSize] = useState("1024x1024");
  const [echoQuality, setEchoQuality] = useState("high");
  // ECHO: fino a 2 immagini extra del cliente. Ogni box ha un RUOLO: noi
  // colleghiamo l'immagine al soggetto in automatico, l'utente non scrive nulla.
  type EchoRef = { dataUrl: string; desc: string; role: string } | undefined;
  const [echoRefs, setEchoRefs] = useState<EchoRef[]>([]);

  async function pickEcho(i: number, file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setEchoRefs((prev) => {
        const next = [...prev];
        next[i] = { dataUrl, desc: next[i]?.desc ?? "", role: next[i]?.role ?? (i === 0 ? "outfit" : "sfondo") };
        return next;
      });
    } catch {
      /* immagine non leggibile */
    }
  }
  function updateEcho(i: number, patch: Partial<NonNullable<EchoRef>>) {
    setEchoRefs((prev) => {
      const next = [...prev];
      if (next[i]) next[i] = { ...next[i]!, ...patch };
      return next;
    });
  }
  function removeEcho(i: number) {
    setEchoRefs((prev) => {
      const next = [...prev];
      next[i] = undefined;
      return next;
    });
  }
  // Ricomincia: torna al form per scrivere una NUOVA scena e nuove immagini.
  function resetGeneration(handle: string) {
    setGenByHandle((m) => { const n = { ...m }; delete n[handle]; return n; });
    setSceneByHandle((m) => { const n = { ...m }; delete n[handle]; return n; });
    setEchoRefs([]);
  }
  const [model, setModel] = useState<SoulModel>(DEFAULT_MODEL);
  const [styleId, setStyleId] = useState("");
  const modelSupportsStyles = engine === "higgsfield" && (SOUL_MODELS.find((m) => m.id === model)?.supportsStyles ?? false);

  const toggle = (cur: string, v: string, set: (s: string) => void) => set(cur === v ? "" : v);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    // Età: il range completo 18–100 = "indifferente" (nessun filtro).
    const ageActive = ageMin > 18 || ageMax < 100;
    if (!gender && !ethnicity && !hair && !ageActive && !category) {
      setError("Seleziona almeno una caratteristica o una categoria d'uso.");
      return;
    }
    const identity = {
      gender: gender || null,
      ethnicity: ethnicity || null,
      hair_color: hair || null,
      age_min: ageActive ? ageMin : null,
      age_max: ageActive ? ageMax : null,
    };
    setLoading(true);
    setError(null);
    setResult(null);
    setGenByHandle({});
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity, category: category || null }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    setResult(json);
  }

  async function generate(handle: string, mode: "preview" | "commercial") {
    setGeneratingHandle(handle);
    setError(null);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle,
        mode,
        category: category || null,
        scene: sceneByHandle[handle] ?? "",
        engine,
        echoSize,
        echoQuality,
        extraRefs: engine === "echo"
          ? echoRefs.filter((r): r is { dataUrl: string; desc: string; role: string } => !!r?.dataUrl).map((r) => ({ data: r.dataUrl, desc: r.desc, role: r.role }))
          : undefined,
        model,
        styleId: modelSupportsStyles ? (styleId || null) : null,
      }),
    });
    const json = await res.json();
    setGeneratingHandle(null);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    setGenByHandle((m) => ({ ...m, [handle]: json }));
  }

  const baseGross = grossForCategory(category || null);
  const priceCents = engine === "echo" ? Math.round(baseGross * echoMultiplier(echoSize, echoQuality)) : baseGross;
  const priceLabel = formatEur(priceCents);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <span className="text-xs font-bold tracking-[0.14em] text-violet-light">PASSO 1 — CHI</span>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Componi l&apos;identikit</h1>
      <p className="mt-2 mb-8 text-sm leading-relaxed text-muted sm:text-base">
        Seleziona le caratteristiche della <span className="text-foreground">persona</span> e la categoria d&apos;uso.
        Cercheremo nel registro un avatar reale e consenziente. La <em>scena</em> la dirigi dopo.
      </p>

      <form onSubmit={search} className="flex flex-col gap-6">
        <ChipGroup label="Genere">
          {GENDERS.map((g) => (
            <Chip key={g.v} active={gender === g.v} onClick={() => toggle(gender, g.v, setGender)}>{g.l}</Chip>
          ))}
        </ChipGroup>

        <div>
          <div className="mb-2.5 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-muted">Età</span>
            <span className="text-[0.7rem] text-faint">· dai {ageMin} ai {ageMax >= 100 ? "100+" : ageMax} anni</span>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-obsidian-2 p-4">
            <label className="flex items-center gap-3">
              <span className="w-7 text-[0.7rem] text-faint">Da</span>
              <input type="range" min={18} max={100} value={ageMin}
                onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax))}
                className="h-1.5 flex-1 cursor-pointer accent-[#6B21E8]" />
              <span className="w-9 text-right text-sm font-bold">{ageMin}</span>
            </label>
            <label className="flex items-center gap-3">
              <span className="w-7 text-[0.7rem] text-faint">A</span>
              <input type="range" min={18} max={100} value={ageMax}
                onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin))}
                className="h-1.5 flex-1 cursor-pointer accent-[#6B21E8]" />
              <span className="w-9 text-right text-sm font-bold">{ageMax >= 100 ? "100+" : ageMax}</span>
            </label>
          </div>
        </div>

        <ChipGroup label="Capelli">
          {HAIRS.map((h) => (
            <Chip key={h} active={hair === h.toLowerCase()} onClick={() => toggle(hair, h.toLowerCase(), setHair)}>{h}</Chip>
          ))}
        </ChipGroup>

        <ChipGroup label="Etnia">
          {ETHNICITIES.map((e) => (
            <Chip key={e} active={ethnicity === e.toLowerCase()} onClick={() => toggle(ethnicity, e.toLowerCase(), setEthnicity)}>{e}</Chip>
          ))}
        </ChipGroup>

        <ChipGroup label="Categoria d'uso" hint="determina prezzo e consenso">
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => toggle(category, c, setCategory)}>{c}</Chip>
          ))}
        </ChipGroup>

        <button type="submit" disabled={loading}
          className="mt-1 rounded-xl bg-[linear-gradient(135deg,#6B21E8,#B8005C)] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_40px_rgba(107,33,232,0.35)] transition-all hover:brightness-110 disabled:opacity-50">
          {loading ? "Ricerca in corso…" : "Cerca avatar affine"}
        </button>
      </form>

      {error && <p className="mt-6 text-sm text-crimson">{error}</p>}

      {result && (
        <div className="mt-8">
          {result.matched && result.results && result.results.length > 0 ? (
            <>
              <p className="mb-4 text-sm font-bold tracking-wide text-teal">
                ✓ {result.results.length} AVATAR {result.results.length === 1 ? "TROVATO" : "TROVATI"}
              </p>
              <div className="flex flex-col gap-4">
                {result.results.map((avatar) => {
                  const gen = genByHandle[avatar.handle];
                  const generating = generatingHandle === avatar.handle;
                  const tier = TIER_CONFIG[avatar.tier];
                  const portrait = avatar.handle === "mario-r" ? "/api/sample/mario-r/0" : avatarArt(avatar.handle, avatar.alias);
                  return (
                    <div key={avatar.handle} className="glass rounded-2xl border-teal/25 p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-obsidian-3">
                          {portrait && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={portrait} alt={avatar.alias} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-lg font-bold">{avatar.alias}</div>
                          <div className="mb-1 text-sm text-muted">@{avatar.handle}</div>
                          <span className="rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold" style={{ background: tier.bg, color: tier.color }}>{tier.label}</span>
                        </div>
                      </div>
                      <p className="mt-4 text-xs text-faint">Affinità: {avatar.reasons.join(" · ")}</p>

                      {avatar.gallery_count > 0 && (
                        <div className="mt-5">
                          <span className="mb-2 block text-xs font-semibold text-muted">
                            Repertorio <span className="font-normal text-faint">· esempi generati da questo volto</span>
                          </span>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {Array.from({ length: avatar.gallery_count }).map((_, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={i} src={`/api/sample/${avatar.handle}/${i}`} alt={`esempio ${i + 1}`} loading="lazy"
                                className="h-[150px] w-[112px] shrink-0 rounded-lg border border-white/8 bg-obsidian-3 object-cover" />
                            ))}
                          </div>
                        </div>
                      )}

                      {!gen ? (
                        <>
                          <div className="mt-5">
                            <label className="mb-2 block text-xs font-bold tracking-[0.1em] text-violet-light">PASSO 2 — SCENA / DIREZIONE</label>
                            <textarea
                              value={sceneByHandle[avatar.handle] ?? ""}
                              onChange={(e) => setSceneByHandle((m) => ({ ...m, [avatar.handle]: e.target.value }))}
                              placeholder="Es. che balla in spiaggia al tramonto, luce dorata, look estivo, 35mm"
                              rows={2}
                              className="w-full resize-y rounded-xl border border-white/10 bg-obsidian px-3 py-3 text-sm text-foreground outline-none focus:border-violet/50"
                            />
                            <p className="mt-2 text-[0.7rem] leading-relaxed text-faint">
                              Scena libera: azione, ambientazione, luce, stile. Il volto resta {avatar.alias} — {engine === "echo" ? "identità bloccata dalle sue foto reali" : "garantito dal Soul"}.
                            </p>
                          </div>

                          <div className="mt-4">
                            <span className="mb-2 block text-xs font-semibold text-muted">Modello</span>
                            <div className="flex flex-wrap gap-2">
                              {SOUL_MODELS.map((m) => (
                                <Chip key={m.id} active={engine === "higgsfield" && model === m.id} onClick={() => { setEngine("higgsfield"); setModel(m.id); }}>{m.label} · {m.quality}</Chip>
                              ))}
                              <Chip active={engine === "echo"} onClick={() => setEngine("echo")}>ECHO · fotoreale</Chip>
                            </div>
                            {engine === "echo" && (
                              <p className="mt-2 text-[0.7rem] leading-relaxed text-teal">
                                Massima fedeltà: l&apos;identità è bloccata dalle foto reali della persona.
                              </p>
                            )}
                          </div>

                          {/* ECHO — risoluzione e qualità (incidono sul prezzo) */}
                          {engine === "echo" && (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <div>
                                <span className="mb-1 block text-xs font-semibold text-muted">Risoluzione</span>
                                <select value={echoSize} onChange={(e) => setEchoSize(e.target.value)}
                                  className="w-full rounded-lg border border-white/10 bg-obsidian-2 px-2 py-2 text-xs text-foreground outline-none focus:border-teal/50">
                                  {ECHO_SIZE_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                                </select>
                              </div>
                              <div>
                                <span className="mb-1 block text-xs font-semibold text-muted">Qualità</span>
                                <select value={echoQuality} onChange={(e) => setEchoQuality(e.target.value)}
                                  className="w-full rounded-lg border border-white/10 bg-obsidian-2 px-2 py-2 text-xs text-foreground outline-none focus:border-teal/50">
                                  {ECHO_QUALITY_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                                </select>
                              </div>
                              {(echoSize === "2560x1440" || echoSize === "3840x2160") && (
                                <p className="col-span-2 text-[0.66rem] leading-relaxed text-crimson-light">
                                  Le risoluzioni alte sono più lente (anche qualche minuto) e più costose.
                                </p>
                              )}
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
                                    <div key={i} className="rounded-xl border border-white/10 bg-obsidian p-2">
                                      {ref?.dataUrl ? (
                                        <>
                                          <div className="relative">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={ref.dataUrl} alt="" className="h-24 w-full rounded-lg object-cover" />
                                            <button
                                              type="button"
                                              onClick={() => removeEcho(i)}
                                              aria-label="Rimuovi"
                                              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                          <select
                                            value={ref.role}
                                            onChange={(e) => updateEcho(i, { role: e.target.value })}
                                            className="mt-2 w-full rounded-lg border border-white/10 bg-obsidian-2 px-2 py-1.5 text-xs text-foreground outline-none focus:border-teal/50"
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
                                            className="mt-1.5 w-full rounded-lg border border-white/10 bg-obsidian-2 px-2.5 py-2 text-xs text-foreground outline-none focus:border-teal/50"
                                          />
                                        </>
                                      ) : (
                                        <label className="flex h-[124px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 text-center text-faint transition-colors hover:border-teal/40 hover:text-teal">
                                          <span className="text-2xl leading-none">+</span>
                                          <span className="px-2 text-[0.68rem] leading-tight">{i === 0 ? "Outfit / capo" : "Scenario / altro"}</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
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
                                Es. outfit + sfondo → {avatar.alias} indossa quell&apos;outfit in quell&apos;ambiente, automaticamente.
                                Il campo &laquo;scena&raquo; sopra è solo per direzioni extra (posa, luce) ed è opzionale.
                              </p>
                            </div>
                          )}

                          {modelSupportsStyles && (
                            <div className="mt-3">
                              <span className="mb-2 block text-xs font-semibold text-muted">Stile <span className="font-normal text-faint">· opzionale</span></span>
                              <div className="flex flex-wrap gap-2">
                                {SOUL_STYLES.map((s) => (
                                  <Chip key={s.id} active={styleId === s.id} onClick={() => setStyleId(styleId === s.id ? "" : s.id)}>{s.label}</Chip>
                                ))}
                              </div>
                            </div>
                          )}

                          <button onClick={() => generate(avatar.handle, "commercial")} disabled={generating}
                            className="mt-4 w-full rounded-xl bg-[linear-gradient(135deg,#6B21E8,#B8005C)] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_40px_rgba(107,33,232,0.35)] transition-all hover:brightness-110 disabled:opacity-50">
                            {generating ? "Generazione…" : `Genera la tua scena · ${priceLabel}`}
                          </button>
                          <p className="mt-2 text-[0.7rem] leading-relaxed text-faint">Output pulito, full-res, con certificato e royalty a {avatar.alias}.</p>
                          <Link href={`/passport/${avatar.handle}`} className="mt-3 block rounded-xl border border-violet/30 bg-violet/10 px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-violet/20">
                            Vedi il passport →
                          </Link>
                        </>
                      ) : (
                        <div className="mt-5 rounded-xl border border-teal/25 bg-obsidian p-5">
                          <p className="mb-3 text-sm font-bold text-teal">✓ Generazione certificata</p>
                          {gen.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            // Mostra la versione con filigrana invisibile (se c'è il certificato),
                            // così l'immagine che l'utente vede/salva porta già il codice nascosto.
                            <img src={gen.certificate ? `/api/content/${gen.certificate}` : gen.image_url} alt="output generato" className="mb-4 w-full max-w-[280px] rounded-lg border border-white/8 bg-obsidian-3" />
                          )}
                          <div className="mb-4 rounded-lg bg-obsidian-2 p-4">
                            <EuroRow label={`Costo generazione${gen.category ? ` (${gen.category})` : ""}`} value={formatEur(gen.gross_cents ?? 0)} dim />
                            <EuroRow label="Fee piattaforma" value={`− ${formatEur(gen.fee_cents ?? 0)}`} dim />
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

                          {/* Genera ancora: stessa scena/immagini (variante) oppure ricomincia da capo */}
                          <div className="mt-4 grid gap-2 border-t border-white/8 pt-4">
                            <button onClick={() => generate(avatar.handle, "commercial")} disabled={generating}
                              className="w-full rounded-xl bg-[linear-gradient(135deg,#6B21E8,#B8005C)] px-5 py-3 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50">
                              {generating ? "Generazione…" : `↻ Genera un'altra variante · ${priceLabel}`}
                            </button>
                            <button onClick={() => resetGeneration(avatar.handle)} disabled={generating}
                              className="w-full rounded-xl border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-50">
                              Nuova scena (cambia prompt e immagini) →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-crimson/30 bg-crimson/5 p-6">
              <p className="mb-2 text-base font-bold text-crimson">⛔ Richiesta bloccata</p>
              <p className="text-sm font-semibold leading-relaxed text-foreground">
                Nessuna persona reale ha acconsentito a questa richiesta. Non possiamo generarla — e
                questo è esattamente il punto.
              </p>
              {result.reason && <p className="mt-2 text-sm leading-relaxed text-muted">{result.reason}</p>}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function ChipGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline gap-2">
        <span className="text-sm font-semibold text-muted">{label}</span>
        {hint && <span className="text-[0.7rem] text-faint">· {hint}</span>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-all ${
        active ? "border border-violet bg-violet/20 text-foreground" : "border border-white/10 bg-obsidian-2 text-muted hover:text-foreground"
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
