"use client";

import Link from "next/link";
import { formatEur } from "@/lib/wallet";
import { ShareStoryButton } from "@/components/share/ShareStoryButton";
import { Anima } from "./Anima";
import { nomi } from "./opzioni";

export interface Esito {
  certificate: string;
  generationId?: string;
  somiglianza?: number; // % misurata con le foto verificate (lib/identity-score)
  dalCasting?: boolean; // il volto l'ha scelto Semblic (casting automatico)
  persone?: { handle: string; alias: string; somiglianza: number | null }[]; // scena di gruppo, da sinistra
  alias: string;
  handle: string;
  size?: string;
  grossCents?: number;
  royaltyCents?: number;
  spent?: number;
  riepilogo: string;
  secondi: number;
}

// Scatto pronto: l'immagine certificata, le tre azioni che servono (scaricare,
// rifare una variante, condividere), dove e' andato il valore e i collegamenti
// alla prova. Gli scatti della sessione restano sotto, a portata di tocco.
export function Risultato({
  esito,
  sessione,
  onScegli,
  onVariante,
  onNuovo,
  onCambiaPersona,
  varianteVolt,
}: {
  esito: Esito;
  sessione: Esito[];
  onScegli: (e: Esito) => void;
  onVariante: () => void;
  onNuovo: () => void;
  onCambiaPersona?: () => void;
  varianteVolt: number | null;
}) {
  const img = `/api/content/${esito.certificate}`;
  const [w, h] = (esito.size ?? "1024x1536").split("x").map(Number);
  const proporzione = w && h ? `${w} / ${h}` : "2 / 3";
  const gruppo = esito.persone && esito.persone.length > 1 ? esito.persone : null;
  const chip = "inline-flex h-[30px] items-center rounded-full bg-[rgba(12,15,23,0.68)] px-3 text-[0.8rem] text-[#F2E9D8]";

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,520px)_1fr] lg:gap-14">
      <div className="relative self-start overflow-hidden rounded-[28px] bg-[var(--hairline)] shadow-[0_40px_80px_-50px_rgba(23,21,15,0.55)]" style={{ aspectRatio: proporzione }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={`Scatto con ${esito.alias}: ${esito.riepilogo}`} className="h-full w-full object-cover" />
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
          <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-[rgba(12,15,23,0.68)] px-3 text-[0.8rem] text-[#F2E9D8]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CC6B2" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
            Certificato {esito.certificate.slice(0, 8)}
          </span>
          {gruppo ? (
            gruppo.map((p) => (
              <span key={p.handle} title={`Somiglianza misurata con le foto verificate di ${p.alias}`} className={chip}>
                {p.alias}{p.somiglianza !== null ? ` ${p.somiglianza}%` : ""}
              </span>
            ))
          ) : esito.somiglianza !== undefined ? (
            <span title={`Misurata con le foto verificate di ${esito.alias}`} className={chip}>
              Somiglianza {esito.somiglianza}%
            </span>
          ) : (
            <span className={chip}>Filigrana invisibile</span>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:pt-2">
        <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-verified">
          Scatto pronto{esito.secondi > 0 ? ` · ${esito.secondi} secondi` : ""}
        </span>
        <h1 className="mt-3 text-[3.2rem] font-bold leading-none tracking-[-0.05em] sm:text-[3.8rem]">Eccola.</h1>
        <p className="mt-3 text-pretty text-[1rem] leading-relaxed text-muted">
          {esito.alias} · {esito.riepilogo}
        </p>
        {gruppo && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[0.92rem] text-muted">
            <span>
              Nella foto ci sono <strong className="text-foreground">{nomi(gruppo.map((p) => p.alias))}</strong>: ogni volto è rifatto con le foto verificate della sua persona, uno alla volta.
              {esito.dalCasting ? " I volti li ha scelti Semblic per la tua scena." : ""}
            </span>
            {esito.dalCasting && onCambiaPersona && (
              <button type="button" onClick={onCambiaPersona} className="font-semibold text-amber-ink hover:underline">Scegli tu le persone</button>
            )}
          </p>
        )}
        {esito.dalCasting && !gruppo && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[0.92rem] text-muted">
            <span>Nella foto c&apos;è <strong className="text-foreground">{esito.alias}</strong>: Semblic ha scelto questo volto per la tua scena.</span>
            {onCambiaPersona && (
              <button type="button" onClick={onCambiaPersona} className="font-semibold text-amber-ink hover:underline">Cambia persona</button>
            )}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2.5">
          <a
            href={img}
            download={`semblic-${esito.certificate.slice(0, 8)}.png`}
            className="inline-flex h-[52px] items-center gap-2.5 rounded-full bg-amber px-6 text-[0.98rem] font-bold text-on-amber transition-colors hover:bg-amber-hover"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /></svg>
            Scarica
          </a>
          <button
            type="button"
            onClick={onVariante}
            className="inline-flex h-[52px] items-center gap-2.5 rounded-full border border-edge bg-surface px-5 text-[0.98rem] font-semibold text-foreground transition-colors hover:border-amber/70"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
            Crea una variante{varianteVolt !== null ? ` · ${varianteVolt} ⚡` : ""}
          </button>
          <ShareStoryButton
            query={`cert=${encodeURIComponent(esito.certificate)}&v=buyer`}
            filename={`semblic-story-${esito.certificate.slice(0, 8)}.png`}
            label="Condividi"
            className="inline-flex h-[52px] items-center rounded-full border border-edge bg-surface px-5 text-[0.98rem] font-semibold text-foreground transition-colors hover:border-amber/70 disabled:opacity-50"
          />
        </div>

        <Anima certificate={esito.certificate} alias={esito.alias} immagine={img} conVolt={Boolean(esito.spent)} gruppo={Boolean(gruppo)} />

        <div className="card mt-3 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[1.05rem] font-bold tracking-[-0.02em]">Ritocca luce e colore</span>
            <span className="text-[0.9rem] leading-snug text-muted">Nell&apos;editor: preset, formati per i social e ingrandimento, senza toccare il volto.</span>
          </div>
          <Link
            href={`/studio/edit/${esito.certificate}`}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-foreground px-5 text-[0.92rem] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
          >
            Apri l&apos;editor
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div className="card flex flex-col gap-1 p-4">
            <span className="text-[0.8rem] text-muted">Speso</span>
            <span className="text-[1.1rem] font-bold">
              {esito.spent ? `${esito.spent} ⚡` : formatEur(esito.grossCents ?? 0)}
              {esito.spent && esito.grossCents ? <span className="ml-1.5 text-[0.85rem] font-medium text-muted">{formatEur(esito.grossCents)}</span> : null}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-[20px] bg-verified-soft p-4">
            <span className="text-[0.8rem] text-on-verified">{gruppo ? `Alle ${gruppo.length} persone` : `A ${esito.alias}`}</span>
            <span className="text-[1.1rem] font-bold text-on-verified">{formatEur(esito.royaltyCents ?? 0)}</span>
            {gruppo && <span className="text-[0.75rem] text-on-verified">in parti uguali</span>}
          </div>
          <Link
            href={esito.generationId ? `/ward/content/${esito.generationId}` : "/account"}
            data-theme="dark"
            className="col-span-2 flex flex-col gap-1 rounded-[20px] bg-[var(--bg)] p-4 text-foreground transition-opacity hover:opacity-90 sm:col-span-1"
          >
            <span className="text-[0.8rem] text-muted">Ward lo sorveglia</span>
            <span className="text-[0.98rem] font-semibold">Cerca copie online</span>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.92rem] font-semibold">
          <a href={`/receipt/${esito.certificate}`} target="_blank" rel="noopener" className="text-amber-ink hover:underline">Ricevuta di conformità</a>
          <Link href="/verify" className="text-amber-ink hover:underline">Verifica con Sigil</Link>
          {(gruppo ?? [{ handle: esito.handle, alias: esito.alias }]).map((p) => (
            <Link key={p.handle} href={`/passport/${p.handle}`} className="text-amber-ink hover:underline">Passaporto di {p.alias}</Link>
          ))}
        </div>

        <span className="mt-7 text-[0.85rem] font-semibold text-muted">Da questa sessione</span>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {sessione.map((s) => (
            <button
              key={s.certificate}
              type="button"
              onClick={() => onScegli(s)}
              aria-label={`Apri lo scatto ${s.riepilogo}`}
              aria-current={s.certificate === esito.certificate}
              className={`h-[112px] w-[86px] overflow-hidden rounded-[14px] bg-[var(--hairline)] transition-shadow ${s.certificate === esito.certificate ? "ring-2 ring-amber ring-offset-2 ring-offset-[var(--bg)]" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/content/${s.certificate}`} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
          <button
            type="button"
            onClick={onNuovo}
            className="flex h-[112px] w-[86px] flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-edge text-[0.8rem] text-muted transition-colors hover:border-amber hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            Nuovo scatto
          </button>
        </div>
      </div>
    </section>
  );
}
