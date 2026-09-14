"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Copy, Check, BadgeCheck, Sparkles, ArrowLeft, AlertTriangle, Link2, Handshake, Smartphone } from "lucide-react";
import { Avatar, ConsentEvent, IDENTITY_KIT, IDENTITY_LABELS } from "@/lib/types";
import { avatarArt } from "@/lib/avatar-art";
import { sampleSrc } from "@/lib/sample-size";

interface Props {
  avatar: Avatar;
  events: ConsentEvent[];
  status: "ATTIVO" | "REVOCATO";
  tier: { label: string; color: string; bg: string; description: string };
  tokenShort: string;
  isPublicFigure?: boolean;
  scanSource?: string;
  availableForBooking?: boolean;
  galleryCount?: number;
  ownership: {
    owner: string;
    ownerVerified?: boolean;
    tokenShort: string;
    issued: string;
    soulbound: boolean;
    chain: string | null;
    tx: string | null;
    anchoredAt: string | null;
    ownerWallet: string | null;
  };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const } }),
};

// Social pubblici della persona: si accetta handle (con o senza @) o URL completo.
function socialHref(kind: "instagram" | "facebook", value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  const handle = value.replace(/^@/, "");
  return kind === "instagram" ? `https://www.instagram.com/${handle}` : `https://www.facebook.com/${handle}`;
}

function socialLabel(value: string): string {
  if (!/^https?:\/\//i.test(value)) return `@${value.replace(/^@/, "")}`;
  try {
    const path = new URL(value).pathname.replace(/\/+$/, "").split("/").pop();
    return path ? `@${path}` : value;
  } catch {
    return value;
  }
}

function SocialPill({ kind, value }: { kind: "instagram" | "facebook"; value: string }) {
  return (
    <a
      href={socialHref(kind, value)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-amber/60 hover:text-foreground"
    >
      {kind === "instagram" ? (
        /* Glifo Instagram inline (lucide non distribuisce più icone brand) */
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      ) : (
        /* Glifo Facebook inline */
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      )}
      {socialLabel(value)}
    </a>
  );
}

export default function PassportClient({ avatar, events, status, tier, tokenShort, isPublicFigure, scanSource = "studio", availableForBooking = false, galleryCount = 0, ownership }: Props) {
  const [copied, setCopied] = useState(false);

  function copyToken() {
    navigator.clipboard.writeText(avatar.token_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const royaltyEur = (avatar.royalty_accrued_cents / 100).toFixed(2);
  // Regola unica: avatar con galleria -> ritratto reale (watermarkato) via
  // route interna; gli altri l'avatar-art. Vale per Mario e per gli ambassador.
  // 720 basta per il riquadro (440px di altezza): su 4G pesa la meta' dell'originale.
  const portrait = galleryCount > 0 ? sampleSrc(`/api/sample/${avatar.handle}/0`, 720) : avatarArt(avatar.handle, avatar.alias);

  const labels: Record<string, string> = {
    GRANTED: "Consenso concesso",
    CATEGORY_ADDED: "Categoria aggiunta",
    CATEGORY_REMOVED: "Categoria rimossa",
    REVOKED: "Revoca del consenso",
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      {/* Back: il passport è una scheda del catalogo, serve una via d'uscita
          chiara su mobile (prima si restava incastrati dentro l'avatar). */}
      <Link href="/catalogo" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tutti i volti
      </Link>
      {/* Header: hero cinematic (base vetro). Il volto a tutto campo, i badge
          in alto su vetro scuro, e il blocco identita in un pannello di vetro
          ancorato in basso: la foto respira sopra, il testo resta leggibile
          sotto in ogni tema. */}
      <motion.div custom={0} variants={fade} initial={false} animate="show"
        className="relative h-[440px] overflow-hidden rounded-3xl border border-border sm:h-[480px]">
        {/* Ritratto a tutto campo (foto reale watermarkata o avatar-art). Per i
            revocati il volto e' desaturato: l'identita e' "spenta". */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={portrait}
          alt={avatar.alias}
          // E' l'elemento piu' grande della pagina: niente coda, priorita' alta.
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-[50%_30%]"
          style={{
            viewTransitionName: `vt-portrait-${avatar.handle}`,
            filter: status === "REVOCATO" ? "grayscale(0.75) brightness(0.8)" : undefined,
          }}
        />
        {/* Glow tramonto del tier in alto + vignette per dare profondita */}
        <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(80% 55% at 80% 8%, ${tier.color}33, transparent 60%)` }} />
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(125% 100% at 50% 18%, transparent 52%, rgba(0,0,0,0.38))" }} />

        {/* Badge sopra la foto: pillole su vetro scuro, leggibili su ogni scatto */}
        <div className="absolute inset-x-4 top-4 flex flex-wrap gap-2">
          {scanSource === "studio" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-verified/50 bg-[rgba(12,15,23,0.55)] px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-[#9FE1CB] backdrop-blur-md">
              <BadgeCheck className="h-3.5 w-3.5" /> Scansione ufficiale
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-[rgba(12,15,23,0.55)] px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-white/85 backdrop-blur-md">
              <Smartphone className="h-3.5 w-3.5" /> Auto-scansione
            </span>
          )}
          {isPublicFigure && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/50 bg-[rgba(12,15,23,0.55)] px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-[#F2A93B] backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" /> Notorieta' verificata
            </span>
          )}
          {availableForBooking && status === "ATTIVO" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-verified/50 bg-[rgba(12,15,23,0.55)] px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-[#9FE1CB] backdrop-blur-md">
              <Handshake className="h-3.5 w-3.5" /> Disponibile per ingaggi
            </span>
          )}
        </div>

        {/* Pannello identita in vetro, ancorato in basso (bottom-left su desktop).
            */}
        <div className="card !absolute inset-x-3 bottom-3 rounded-2xl p-5 sm:inset-x-4 sm:bottom-4 sm:max-w-md">
          {/* Tier come kicker sopra al nome */}
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-soft px-3 py-1">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber" />
            <span className="text-xs font-bold tracking-wide text-amber-ink">{tier.label}</span>
            <span className="text-xs text-muted">· {tier.description}</span>
          </div>

          <h1 className="text-[2.4rem] font-bold leading-[1] tracking-[-0.04em] sm:text-5xl">{avatar.alias}</h1>
          <p className="mt-1 text-sm text-muted">@{avatar.handle}</p>
          {/* Nome e cognome PUBBLICO: compare solo se la persona lo dichiara */}
          {avatar.real_name && (
            <p className="mt-0.5 text-sm font-semibold text-foreground/90">{avatar.real_name}</p>
          )}
          {(avatar.instagram || avatar.facebook) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {avatar.instagram && <SocialPill kind="instagram" value={avatar.instagram} />}
              {avatar.facebook && <SocialPill kind="facebook" value={avatar.facebook} />}
            </div>
          )}

          <div className="mt-3">
            {status === "ATTIVO" ? (
              <span className="inline-block rounded-full border border-green/30 bg-green/10 px-4 py-1 text-sm font-semibold text-green">Attivo</span>
            ) : (
              <span className="inline-block rounded-full border border-blocked/50 bg-blocked-soft px-4 py-1 text-sm font-semibold text-blocked">Revocato</span>
            )}
            {status === "REVOCATO" && (
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-blocked">
                Questa persona ha ritirato il consenso. Il suo volto non è più generabile.
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Atto di proprietà */}
      <motion.div custom={1} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
        className="card relative mt-4 overflow-hidden rounded-2xl p-6">
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(55% 38% at 94% -6%, rgba(242,169,59,0.12), transparent 60%)" }} />
        <div className="relative">
          {/* Header editoriale: indice 01 + etichetta + hairline tramonto */}
          <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="shrink-0 font-mono text-[1.4rem] font-semibold leading-none tracking-[-0.02em] text-faint">01</span>
            <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
            <p className="kicker">Atto di proprieta'</p>
          </div>
          <div className="mb-5 mt-3 h-px" style={{ background: "linear-gradient(90deg, rgba(242,169,59,0.55), var(--hairline) 38%, transparent 80%)" }} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-0.5 text-[0.7rem] text-muted">Titolare</p>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              {ownership.owner}
              {ownership.ownerVerified && <BadgeCheck className="h-3.5 w-3.5 text-verified" />}
            </p>
          </div>
          <div>
            <p className="mb-0.5 text-[0.7rem] text-muted">Registrato il</p>
            <p className="text-sm font-semibold">{formatDate(ownership.issued)}</p>
          </div>
        </div>

        {/* Stato ancoraggio on-chain */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
          <Link2 className="h-4 w-4 shrink-0 text-muted" />
          {ownership.tx ? (
            <p className="text-xs text-muted">
              Ancorato su <span className="font-semibold text-foreground capitalize">{ownership.chain ?? "on-chain"}</span> ·{" "}
              <span className="font-mono text-amber-ink">{ownership.tx.slice(0, 14)}…</span>
            </p>
          ) : (
            <p className="text-xs text-muted">
              <span className="font-semibold text-foreground">Pronto per l&apos;ancoraggio on-chain</span>, la proprietà verrà ancorata su Base.
            </p>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-faint">
          Questo è il titolo del volto: <strong className="text-muted">non vendibile</strong> (non si vende la propria identità).
          Le licenze d&apos;uso sono separate e tracciabili, con royalty alla persona a ogni utilizzo.
        </p>
        </div>
      </motion.div>

      {/* Repertorio */}
      {galleryCount > 0 && (
        <Card i={1} label="Repertorio: esempi generati">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: galleryCount }).map((_, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={idx} src={sampleSrc(`/api/sample/${avatar.handle}/${idx}`, 720)} alt={`esempio ${idx + 1}`} loading="lazy"
                className="aspect-[3/4] w-full rounded-[14px] bg-elevated object-cover" />
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-faint">
            Immagini generate da Semblic col consenso di {avatar.alias}, watermarkate. Le generazioni commerciali sono pulite e certificate.
          </p>
        </Card>
      )}

      {/* CTA: dal volto alla generazione, senza passare dal brief. Solo per
          avatar ATTIVI: un consenso revocato non è generabile, niente pulsante. */}
      {status === "ATTIVO" && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
          className="mt-5"
        >
          <Link
            href={`/match?avatar=${avatar.handle}`}
            className="block w-full rounded-full bg-amber px-8 py-5 text-center text-[1.15rem] font-bold tracking-[-0.01em] text-on-amber transition-colors hover:bg-amber-hover sm:text-[1.3rem]"
          >
            Genera con questo avatar
          </Link>
          <p className="mt-2 text-center text-xs text-faint">
            Vai dritto alla generazione: {avatar.alias} è già selezionat{avatar.gender === "Donna" ? "a" : "o"}, il consenso resta il filtro.
          </p>
        </motion.div>
      )}

      {/* B3 fase "ora": CTA ingaggio reale verso il contatto esistente. Solo per
          avatar ATTIVI e disponibili. Nessun nuovo flusso di booking. */}
      {availableForBooking && status === "ATTIVO" && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
          className="card mt-4 rounded-2xl p-5"
        >
          <div className="mb-2 flex items-center gap-2">
            <Handshake className="h-4 w-4 text-verified" />
            <p className="kicker text-verified">Ingaggi reali</p>
          </div>
          <p className="mb-3 text-sm leading-relaxed text-muted">
            {avatar.alias} e&apos; disponibile per uno shooting reale con la persona vera. Semblic fa da garante: l&apos;AI non sostituisce i modelli, gli procura lavoro.
          </p>
          <Link
            href={`/contatti?ingaggio=${avatar.handle}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-verified/50 bg-verified-soft px-5 py-2 text-sm font-bold text-verified transition-colors hover:bg-verified-soft"
          >
            Richiedi un ingaggio
          </Link>
        </motion.div>
      )}

      {/* Identity kit */}
      <Card i={2} index="02" label="Identity kit" badge="Immutabile" accent="teal">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {(Object.keys(IDENTITY_KIT) as (keyof typeof IDENTITY_KIT)[]).map((field) => (
            <div key={field}>
              <p className="mb-0.5 text-[0.7rem] text-muted">{IDENTITY_LABELS[field]}</p>
              <p className="text-sm font-semibold capitalize">{avatar[field] ?? "—"}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Token */}
      <Card i={3} index="03" label="Token di verifica">
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-full bg-amber-soft px-3.5 py-2 font-mono text-[0.95rem] tracking-wide text-amber-ink">{tokenShort}</code>
          <button onClick={copyToken}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${copied ? "border-verified/50 bg-verified-soft text-verified" : "border-edge bg-surface text-muted hover:text-foreground"}`}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiato" : "Copia token"}
          </button>
          <Link href="/verify" className="rounded-full border border-amber/50 px-3.5 py-2 text-sm font-semibold text-amber-ink transition-colors hover:bg-amber-soft">Verifica con Sigil</Link>
          {/* Badge embeddabile (Fase 4): da qui prendi il codice per metterlo
              sul tuo sito. Solo per i volti attivi: per un revocato il badge
              direbbe "consenso revocato", non ha senso incorporarne uno nuovo. */}
          {!avatar.revoked_at && (
            <Link href={`/badge?handle=${avatar.handle}`} className="rounded-full border border-verified/50 px-3.5 py-2 text-sm font-semibold text-verified transition-colors hover:bg-verified-soft">Incorpora il badge</Link>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-faint">
          Identificativo univoco e certificato di questo volto. Prova che è reale.
        </p>
      </Card>

      {/* Timeline — review C4: il consent ledger reso come timeline GRAFICA.
          La linea CONTINUA per i consensi attivi; per i revocati SI INTERROMPE
          alla revoca: l'interruzione è la prova. Solo rendering, zero logica. */}
      <Card i={4} index="04" label="Timeline di consenso">
        {(() => {
          const isRevokedAvatar = Boolean(avatar.revoked_at);
          // Fallback se il ledger è vuoto: la concessione dal passport stesso.
          const items: ConsentEvent[] = events.length > 0 ? events : [{
            id: "granted-fallback",
            avatar_id: avatar.id,
            event_type: "GRANTED",
            detail: null,
            occurred_at: avatar.consent_start,
          }];
          return (
            <ol className="ml-0.5">
              {items.map((ev) => {
                const isRevokeEv = ev.event_type === "REVOKED";
                const bad = isRevokeEv || ev.event_type === "CATEGORY_REMOVED";
                const c = bad ? "var(--blocked-c)" : "var(--verified-c)";
                return (
                  <li key={ev.id} className="relative flex gap-4 pb-6">
                    {/* segmento di linea verso l'elemento successivo */}
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-[5px] top-4 w-px"
                      style={{ background: isRevokeEv ? "linear-gradient(180deg, rgba(242,149,140,0.6), rgba(242,149,140,0.25))" : "var(--hairline)" }}
                    />
                    <span
                      className="relative z-10 mt-[3px] h-[11px] w-[11px] shrink-0 rounded-full"
                      style={{ background: isRevokeEv ? c : "transparent", border: `2px solid ${c}`, boxShadow: `0 0 10px color-mix(in oklab, ${c} 27%, transparent)` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <span className="text-sm font-semibold" style={{ color: c }}>{labels[ev.event_type]}</span>
                        <span className="font-mono text-xs text-faint">{formatDate(ev.occurred_at)}</span>
                      </div>
                      {ev.detail && <p className="mt-0.5 text-sm leading-snug text-muted">{ev.detail}</p>}
                    </div>
                  </li>
                );
              })}

              {/* Capolinea: la linea continua (attivo) o si interrompe (revocato) */}
              <li className="relative flex gap-4">
                {isRevokedAvatar ? (
                  <>
                    <span className="relative z-10 mt-[6px] flex h-[11px] w-[11px] shrink-0 items-center justify-center" aria-hidden>
                      <span className="block h-[3px] w-[11px] rounded-full bg-blocked shadow-[0_0_10px_rgba(242,149,140,0.5)]" />
                    </span>
                    <p className="text-sm leading-relaxed">
                      <span className="font-bold text-blocked">La timeline si interrompe qui.</span>{" "}
                      <span className="text-muted">Questa persona ha cambiato idea, il sistema ha obbedito. Nessuna generazione futura.</span>
                    </p>
                  </>
                ) : (
                  <>
                    <span className="relative z-10 mt-[4px] h-[11px] w-[11px] shrink-0" aria-hidden>
                      <span className="absolute inset-0 animate-ping rounded-full bg-verified opacity-50 motion-reduce:hidden" />
                      <span className="relative block h-[11px] w-[11px] rounded-full border-2 border-verified bg-verified-soft" />
                    </span>
                    <p className="text-sm leading-relaxed">
                      <span className="font-bold text-verified">Consenso attivo.</span>{" "}
                      <span className="text-muted">La timeline continua, e resta sempre revocabile.</span>
                    </p>
                  </>
                )}
              </li>
            </ol>
          );
        })()}
        <div className="mt-4 flex flex-wrap gap-8 border-t border-border pt-4">
          <div>
            <span className="text-xs text-muted">Autorizzato dal</span>
            <p className="mt-0.5 text-sm font-semibold">{formatDate(avatar.consent_start)}</p>
          </div>
          {avatar.revoked_at && (
            <div>
              <span className="text-xs text-muted">Revocato dal</span>
              <p className="mt-0.5 text-sm font-semibold text-blocked">{formatDate(avatar.revoked_at)}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Consenso all'uso (modello senza categorie: sì/no) */}
      <Card i={5} index="05" label="Consenso all'uso" accent="teal">
        {avatar.revoked_at ? (
          <span className="inline-block rounded-full border border-blocked/50 bg-blocked-soft px-3 py-1 text-sm font-semibold text-blocked">Consenso revocato</span>
        ) : avatar.commercial_consent === false ? (
          <span className="inline-block rounded-full border border-blocked/50 bg-blocked-soft px-3 py-1 text-sm font-semibold text-blocked">Uso commerciale non consentito</span>
        ) : (
          <span className="inline-block rounded-full border border-verified/50 bg-verified-soft px-3 py-1 text-sm font-semibold text-verified">Uso commerciale consentito</span>
        )}
        <p className="mt-3 text-xs leading-relaxed text-faint">
          Il consenso è sì o no, non più per categoria: vale per ogni uso commerciale e si può revocare in qualsiasi momento. La revoca è prospettica.
        </p>
      </Card>

      {/* Statistiche */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="card relative overflow-hidden rounded-2xl p-5">
          <p className="kicker mb-2">Utilizzi totali</p>
          <p className="text-3xl font-bold leading-none tracking-[-0.04em] sm:text-5xl">{avatar.usage_count.toLocaleString("it-IT")}</p>
        </div>
        <div className="card relative overflow-hidden rounded-2xl p-5">
          <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(70% 60% at 100% 0%, rgba(242,169,59,0.12), transparent 60%)" }} />
          <p className="kicker relative mb-2">Royalty maturate</p>
          <p className="relative text-3xl font-bold leading-none tracking-[-0.04em] text-amber-ink sm:text-5xl">€{royaltyEur}</p>
        </div>
      </div>

      {/* Nota legale */}
      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs leading-relaxed text-faint">
          Questo soggetto è una persona reale che ha dato consenso esplicito all&apos;utilizzo commerciale della propria immagine.
          Ogni utilizzo genera una royalty a suo favore. La revoca del consenso è prospettica: blocca gli utilizzi futuri, non cancella quelli passati.
          Nessun dato biometrico è memorizzato o trasmesso.
        </p>
      </div>

      {/* Segnala abuso */}
      <div className="mt-6 text-center">
        <Link href={`/report?handle=${encodeURIComponent(avatar.handle)}`} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
          <AlertTriangle className="h-4 w-4" />
          Questo avatar non rappresenta una persona consenziente? <span className="font-semibold text-blocked">Segnala un abuso</span>
        </Link>
      </div>
    </main>
  );
}

// Card di sezione in vetro: header editoriale (indice numerato sottile +
// etichetta + hairline tramonto) e glow d'angolo tematico, con reveal allo
// scroll. L'accento (amber o salvia) tinge glow, hairline e badge. L'header va a
// capo se stretto: regge sia mobile sia desktop.
function Card({ i, index, label, badge, accent = "amber", children }: { i: number; index?: string; label: string; badge?: string; accent?: "amber" | "teal"; children: React.ReactNode }) {
  const a = accent === "teal"
    ? { glow: "rgba(127,174,150,0.12)", line: "rgba(127,174,150,0.5)", badge: "border-verified/50 bg-verified-soft text-verified" }
    : { glow: "rgba(242,169,59,0.12)", line: "rgba(242,169,59,0.55)", badge: "border-amber/50 bg-amber-soft text-amber-ink" };
  return (
    <motion.section custom={i} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
      className="card relative mt-4 overflow-hidden rounded-2xl p-6">
      <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(55% 38% at 94% -6%, ${a.glow}, transparent 60%)` }} />
      <div className="relative">
        <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {index && <span className="shrink-0 font-mono text-[1.4rem] font-semibold leading-none tracking-[-0.02em] text-faint">{index}</span>}
          {index && <span aria-hidden className="h-6 w-px shrink-0 bg-border" />}
          <p className="kicker">{label}</p>
          {badge && <span className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[0.62rem] font-bold tracking-wide ${a.badge}`}>{badge}</span>}
        </div>
        <div className="mb-5 mt-3 h-px" style={{ background: `linear-gradient(90deg, ${a.line}, var(--hairline) 38%, transparent 80%)` }} />
        {children}
      </div>
    </motion.section>
  );
}
