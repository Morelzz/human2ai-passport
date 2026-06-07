"use client";

import { useState } from "react";
import Link from "next/link";
import { TIER_CONFIG, Tier, CATEGORIES } from "@/lib/types";
import { formatEur, grossForCategory } from "@/lib/wallet";
import { SOUL_MODELS, SOUL_STYLES, DEFAULT_MODEL, SoulModel } from "@/lib/soul-models";
import { avatarArt } from "@/lib/avatar-art";

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

  // Impostazioni di generazione: modello (qualità) + stile (solo Soul ID)
  const [model, setModel] = useState<SoulModel>(DEFAULT_MODEL);
  const [styleId, setStyleId] = useState("");
  const modelSupportsStyles = SOUL_MODELS.find((m) => m.id === model)?.supportsStyles ?? false;

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
        model,
        styleId: modelSupportsStyles ? (styleId || null) : null,
      }),
    });
    const json = await res.json();
    setGeneratingHandle(null);
    if (!res.ok) { setError(json.error ?? "Errore"); return; }
    setGenByHandle((m) => ({ ...m, [handle]: json }));
  }

  const priceLabel = formatEur(grossForCategory(category || null));

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
                              Scena libera: azione, ambientazione, luce, stile. Il volto resta {avatar.alias} — garantito dal Soul.
                            </p>
                          </div>

                          <div className="mt-4">
                            <span className="mb-2 block text-xs font-semibold text-muted">Modello</span>
                            <div className="flex flex-wrap gap-2">
                              {SOUL_MODELS.map((m) => (
                                <Chip key={m.id} active={model === m.id} onClick={() => setModel(m.id)}>{m.label} · {m.quality}</Chip>
                              ))}
                            </div>
                          </div>

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
              <p className="text-sm leading-relaxed text-muted">{result.reason}</p>
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
