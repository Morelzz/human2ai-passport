"use client";

import { useMemo, useState } from "react";
import { ShareStoryButton } from "@/components/share/ShareStoryButton";

// Griglia "I miei contenuti" con FILTRI (categoria, motore, avatar) e regola
// anti-limbo: si mostrano 6 elementi, "Carica altri" ne aggiunge 6 (mai scroll
// infinito). Doppio pulsante Scarica (viola) + Condividi (teal) su ogni card.
// Client: filtra/pagina sull'elenco già caricato dal server.

export type GridItem = {
  id: string;
  certificate: string | null;
  image_url: string | null;
  category: string | null;
  tier: string | null;
  created_at: string;
  alias: string;
  handle: string;
};

const PAGE = 6;

export function ContentsGrid({ items, shareVariant = "buyer" }: { items: GridItem[]; shareVariant?: "buyer" | "seller" }) {
  const [cat, setCat] = useState("");
  const [engine, setEngine] = useState("");
  const [avatar, setAvatar] = useState("");
  const [visible, setVisible] = useState(PAGE);

  // Opzioni dei filtri: solo i valori presenti nei contenuti reali.
  const cats = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))] as string[], [items]);
  const engines = useMemo(() => [...new Set(items.map((i) => i.tier).filter(Boolean))] as string[], [items]);
  const avatars = useMemo(() => {
    const m = new Map<string, string>();
    items.forEach((i) => m.set(i.handle, i.alias));
    return [...m.entries()];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(
      (i) => (!cat || i.category === cat) && (!engine || i.tier === engine) && (!avatar || i.handle === avatar)
    );
  }, [items, cat, engine, avatar]);

  const shown = filtered.slice(0, visible);
  const sel = "rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-foreground focus:border-violet/50 focus:outline-none";

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setVisible(PAGE);
    };
  }

  return (
    <div>
      {/* Filtri: compaiono solo se c'è più di una opzione da filtrare */}
      {(cats.length > 1 || engines.length > 1 || avatars.length > 1) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {cats.length > 1 && (
            <select className={sel} value={cat} onChange={(e) => resetPage(setCat)(e.target.value)} aria-label="Filtra per categoria">
              <option value="">Tutte le categorie</option>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {engines.length > 1 && (
            <select className={sel} value={engine} onChange={(e) => resetPage(setEngine)(e.target.value)} aria-label="Filtra per motore">
              <option value="">Tutti i motori</option>
              {engines.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {avatars.length > 1 && (
            <select className={sel} value={avatar} onChange={(e) => resetPage(setAvatar)(e.target.value)} aria-label="Filtra per volto">
              <option value="">Tutti i volti</option>
              {avatars.map(([h, a]) => <option key={h} value={h}>{a}</option>)}
            </select>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">Nessun contenuto con questi filtri.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {shown.map((g) => (
              <div key={g.id} className="overflow-hidden rounded-xl border border-white/8 bg-[#141A24]">
                {g.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.image_url} alt="contenuto" className="block aspect-[3/4] w-full bg-obsidian-3 object-cover" />
                )}
                <div className="p-3">
                  <div className="mb-0.5 flex items-center justify-between gap-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">{g.alias}</p>
                    {g.tier && (
                      <span className="shrink-0 rounded-full border border-violet/30 bg-violet/10 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-violet-light">{g.tier}</span>
                    )}
                  </div>
                  <p className="mb-2 text-[0.7rem] text-faint">
                    {g.category ?? "-"} · {new Date(g.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                  </p>
                  {g.certificate && (
                    <>
                      <div className="flex gap-1.5">
                        <a href={`/api/content/${g.certificate}`} className="flex-1 rounded-lg border border-violet/30 bg-violet/10 px-2 py-1.5 text-center text-[0.72rem] font-semibold text-violet-light transition-colors hover:bg-violet/20">
                          Scarica
                        </a>
                        <ShareStoryButton
                          query={`cert=${encodeURIComponent(g.certificate)}&v=${shareVariant}`}
                          filename={`semblic-story-${g.certificate.slice(0, 8)}.png`}
                          label="Condividi"
                          className="flex-1 rounded-lg border border-teal/30 bg-teal/10 px-2 py-1.5 text-center text-[0.72rem] font-semibold text-teal transition-colors hover:bg-teal/20 disabled:opacity-50"
                        />
                      </div>
                      {/* Fase 3.3: ricevuta di conformita' come pagina stampabile
                          (Stampa -> Salva come PDF); dentro c'e' anche il download
                          JSON per l'archivio/API. */}
                      <a href={`/receipt/${g.certificate}`} target="_blank" rel="noopener noreferrer" className="mt-1.5 block text-center text-[0.66rem] text-faint underline-offset-2 transition-colors hover:text-muted hover:underline">
                        Ricevuta di conformità
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {visible < filtered.length && (
            <button
              onClick={() => setVisible((v) => v + PAGE)}
              className="mt-4 w-full rounded-xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-muted transition-colors hover:text-foreground"
            >
              Carica altri ({filtered.length - visible} rimasti)
            </button>
          )}
        </>
      )}
    </div>
  );
}
