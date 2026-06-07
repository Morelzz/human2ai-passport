"use client";

import { useEffect, useMemo, useState } from "react";

// Generatore del badge embeddabile. Tutto lato client: anteprima live + snippet
// copia-incolla (HTML e Markdown) con URL assoluto risolto da window.location.

const SIZES = [
  { key: "S", label: "Piccolo", w: 240 },
  { key: "M", label: "Medio", w: 340 },
  { key: "L", label: "Grande", w: 440 },
] as const;

// Rapporto nativo dell'SVG: 340×84.
function heightFor(w: number) {
  return Math.round((w * 84) / 340);
}

// Normalizza l'handle digitato (minuscolo, niente @ né spazi).
function normalizeHandle(s: string) {
  return s.trim().toLowerCase().replace(/^@+/, "").replace(/\s+/g, "");
}

export default function BadgeClient({ initialHandle }: { initialHandle: string }) {
  const [handle, setHandle] = useState(normalizeHandle(initialHandle));
  const [size, setSize] = useState<(typeof SIZES)[number]["key"]>("M");
  const [origin, setOrigin] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState<"html" | "md" | null>(null);

  // L'URL assoluto è quello del sito corrente (dev o produzione).
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Reset dello stato "non trovato" ogni volta che cambia l'handle.
  useEffect(() => {
    setNotFound(false);
  }, [handle]);

  const w = SIZES.find((s) => s.key === size)!.w;
  const h = heightFor(w);

  const badgeUrl = origin ? `${origin}/api/badge/${handle}` : `/api/badge/${handle}`;
  const passportUrl = origin ? `${origin}/passport/${handle}` : `/passport/${handle}`;

  const htmlSnippet = useMemo(
    () =>
      `<a href="${passportUrl}" target="_blank" rel="noopener">\n` +
      `  <img src="${badgeUrl}" alt="Volto Verificato su HUMAN2AI" width="${w}" height="${h}">\n` +
      `</a>`,
    [passportUrl, badgeUrl, w, h]
  );

  const mdSnippet = useMemo(
    () => `[![Volto Verificato su HUMAN2AI](${badgeUrl})](${passportUrl})`,
    [badgeUrl, passportUrl]
  );

  const canUse = handle.length > 0 && !notFound;

  async function copy(kind: "html" | "md") {
    const text = kind === "html" ? htmlSnippet : mdSnippet;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard non disponibile: l'utente può selezionare manualmente */
    }
  }

  return (
    <div className="space-y-5">
      {/* Handle */}
      <div className="glass rounded-2xl p-5">
        <label htmlFor="h" className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.12em] text-faint">
          Handle dell&apos;avatar
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-obsidian px-3 focus-within:border-teal/50">
          <span className="text-muted">@</span>
          <input
            id="h"
            value={handle}
            onChange={(e) => setHandle(normalizeHandle(e.target.value))}
            placeholder="mario-r"
            spellCheck={false}
            autoCapitalize="none"
            className="w-full bg-transparent py-3 font-mono text-sm text-foreground outline-none placeholder:text-faint"
          />
        </div>
        {notFound && (
          <p className="mt-2 text-xs text-crimson-light">
            Nessun avatar pubblico con questo handle (o non ancora approvato).
          </p>
        )}
      </div>

      {/* Anteprima + dimensione */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-faint">Anteprima</span>
          <div className="flex gap-1 rounded-lg border border-white/10 p-0.5">
            {SIZES.map((s) => (
              <button
                key={s.key}
                onClick={() => setSize(s.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  size === s.key ? "bg-violet/25 text-violet-light" : "text-muted hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-white/[0.06] bg-[radial-gradient(60%_80%_at_50%_0%,rgba(107,33,232,0.10),transparent_70%)] p-6">
          {handle ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={handle}
              src={`/api/badge/${handle}`}
              alt="Anteprima badge Volto Verificato"
              width={w}
              height={h}
              onError={() => setNotFound(true)}
              className="max-w-full"
            />
          ) : (
            <span className="text-sm text-faint">Inserisci un handle per vedere il badge.</span>
          )}
        </div>

        {canUse && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <a href={`/api/badge/${handle}`} target="_blank" rel="noopener" className="text-teal hover:underline">
              Apri il badge ↗
            </a>
            <a href={`/passport/${handle}`} className="text-violet-light hover:underline">
              Vai al passport →
            </a>
          </div>
        )}
      </div>

      {/* Snippet HTML */}
      <SnippetBox
        title="Incorpora (HTML)"
        hint="Per un sito web."
        code={htmlSnippet}
        disabled={!canUse}
        copied={copied === "html"}
        onCopy={() => copy("html")}
      />

      {/* Snippet Markdown */}
      <SnippetBox
        title="Incorpora (Markdown)"
        hint="Per README, GitHub, Notion…"
        code={mdSnippet}
        disabled={!canUse}
        copied={copied === "md"}
        onCopy={() => copy("md")}
      />

      <p className="px-1 text-xs leading-relaxed text-faint">
        Il badge è un&apos;immagine SVG servita in tempo reale: rispecchia sempre lo stato del consenso nel
        registro. Cliccandolo si arriva alla prova pubblica.
      </p>
    </div>
  );
}

function SnippetBox({
  title,
  hint,
  code,
  disabled,
  copied,
  onCopy,
}: {
  title: string;
  hint: string;
  code: string;
  disabled: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="text-xs text-faint">{hint}</p>
        </div>
        <button
          onClick={onCopy}
          disabled={disabled}
          className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
            disabled
              ? "cursor-not-allowed bg-white/5 text-faint"
              : copied
                ? "bg-teal/20 text-teal-light"
                : "bg-gradient-to-r from-violet to-crimson text-white hover:opacity-90"
          }`}
        >
          {copied ? "Copiato!" : "Copia"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-obsidian p-3.5 text-xs leading-relaxed text-muted">
        <code>{code}</code>
      </pre>
    </div>
  );
}
