"use client";

import { useMemo, useState } from "react";
import { ScanSearch } from "lucide-react";
import { ShareStoryButton } from "@/components/share/ShareStoryButton";
import { KitButton } from "@/components/content/KitButton";

// Griglia "I miei contenuti" con FILTRI (categoria, motore, avatar) e regola
// anti-limbo: si mostrano 6 elementi, "Carica altri" ne aggiunge 6 (mai scroll
// infinito). Doppio pulsante Scarica (ambra) + Condividi (verde) su ogni card.
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
  // Immagini che non si caricano (file sparito dallo storage): segnaposto, mai il testo alt.
  const [rotte, setRotte] = useState<Set<string>>(() => new Set());

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
  const sel = "rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:border-amber/50 focus:outline-none";

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
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {shown.map((g) => (
              <div key={g.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                {g.image_url && !rotte.has(g.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.image_url}
                    alt={`Contenuto generato con ${g.alias}`}
                    loading="lazy"
                    onError={() => setRotte((s) => new Set(s).add(g.id))}
                    className="block aspect-[3/4] w-full bg-[var(--hairline)] object-cover"
                  />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center bg-[var(--hairline)] px-4 text-center text-[0.75rem] text-faint">
                    Anteprima non disponibile
                  </div>
                )}
                <div className="p-3">
                  <div className="mb-0.5 flex items-center justify-between gap-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">{g.alias}</p>
                    {g.tier && (
                      <span className="shrink-0 rounded-full border border-amber/50 bg-amber-soft px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-amber-ink">{g.tier}</span>
                    )}
                  </div>
                  <p className="mb-2 text-[0.7rem] text-faint">
                    {g.category ? `${g.category} · ` : ""}{new Date(g.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                  </p>
                  {g.certificate && (
                    <>
                      {/* Tasto grande Modifica (Semblic Editor) sopra Scarica/Condividi */}
                      <a href={`/studio/edit/${g.certificate}`} className="mb-1.5 block w-full rounded-full bg-amber px-2 py-2 text-center text-[0.78rem] font-semibold text-on-amber transition-colors hover:bg-amber-hover">
                        Modifica
                      </a>
                      {/* Ward: cerca le copie di QUESTA immagine sul web. Tasto vero
                          e prominente (solo buyer, e' il suo asset). */}
                      {shareVariant === "buyer" && (
                        <a href={`/ward/content/${g.id}`} className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-amber/50 bg-amber-soft px-2 py-2 text-[0.78rem] font-semibold text-amber-ink transition-colors hover:border-amber">
                          <ScanSearch className="h-3.5 w-3.5" aria-hidden /> Ward
                        </a>
                      )}
                      <div className="flex items-center justify-center gap-4 py-1">
                        <a href={`/api/content/${g.certificate}`} className="text-[0.8rem] font-semibold text-muted underline-offset-2 transition-colors hover:text-foreground hover:underline">
                          Scarica
                        </a>
                        <ShareStoryButton
                          query={`cert=${encodeURIComponent(g.certificate)}&v=${shareVariant}`}
                          filename={`semblic-story-${g.certificate.slice(0, 8)}.png`}
                          label="Condividi"
                          className="text-[0.8rem] font-semibold text-muted underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:opacity-50"
                        />
                      </div>
                      {/* Kit campagna: i quattro tagli pronti + la liberatoria,
                          in uno zip. Solo per chi ha comprato lo scatto. */}
                      {shareVariant === "buyer" && (
                        <KitButton
                          certificate={g.certificate}
                          className="mt-1 block w-full rounded-full border border-edge px-2 py-1.5 text-center text-[0.76rem] font-semibold text-muted transition-colors hover:border-amber/70 hover:text-foreground disabled:opacity-60"
                        />
                      )}
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
              className="mt-4 w-full rounded-full border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted transition-colors hover:text-foreground"
            >
              Carica altri ({filtered.length - visible} rimasti)
            </button>
          )}
        </>
      )}
    </div>
  );
}
