"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Copy, Check, BadgeCheck, Sparkles, ArrowLeft, AlertTriangle, Fingerprint, Link2, Handshake } from "lucide-react";
import { Avatar, ConsentEvent, IDENTITY_KIT, IDENTITY_LABELS } from "@/lib/types";
import { avatarArt } from "@/lib/avatar-art";

interface Props {
  avatar: Avatar;
  events: ConsentEvent[];
  status: "ATTIVO" | "REVOCATO";
  tier: { label: string; color: string; bg: string; description: string };
  tokenShort: string;
  isPublicFigure?: boolean;
  isRealPerson?: boolean;
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
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/[0.03] px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-violet/40 hover:text-foreground"
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

export default function PassportClient({ avatar, events, status, tier, tokenShort, isPublicFigure, isRealPerson = true, availableForBooking = false, galleryCount = 0, ownership }: Props) {
  const [copied, setCopied] = useState(false);

  function copyToken() {
    navigator.clipboard.writeText(avatar.token_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const royaltyEur = (avatar.royalty_accrued_cents / 100).toFixed(2);
  // Regola unica: avatar con galleria -> ritratto reale (watermarkato) via
  // route interna; gli altri l'avatar-art. Vale per Mario e per gli ambassador.
  const portrait = galleryCount > 0 ? `/api/sample/${avatar.handle}/0` : avatarArt(avatar.handle, avatar.alias);

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
        <ArrowLeft className="h-4 w-4" /> Avatar
      </Link>
      {/* Header card */}
      <motion.div custom={0} variants={fade} initial="hidden" animate="show" className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(70% 90% at 15% 0%, ${tier.color}22, transparent 65%)` }} />
        <div className="relative flex flex-wrap items-start gap-6">
          {/* Portrait */}
          <div className="shrink-0">
            <div className="h-28 w-28 overflow-hidden rounded-2xl border bg-obsidian-3" style={{ borderColor: `${tier.color}55` }}>
              {portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portrait} alt={avatar.alias} className="h-full w-full object-cover" style={{ viewTransitionName: `vt-portrait-${avatar.handle}` }} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">👤</div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="min-w-[200px] flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              {/* Ogni volto del registro è una persona reale verificata (gli
                  ambassador conosciuti di persona, i creatori via KYC). Badge
                  unico: niente più "SEMBLIC VERIFIED" doppione. Mai sui demo. */}
              {isRealPerson && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[0.7rem] font-bold tracking-wide text-teal">
                  <BadgeCheck className="h-3.5 w-3.5" /> PERSONA REALE VERIFICATA
                </span>
              )}
              {/* Volto noto (personaggio pubblico): badge premium di notorietà.
                  Solo display, il pricing public-figure resta dormiente. */}
              {isPublicFigure && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-[0.7rem] font-bold tracking-wide text-violet-light">
                  <Sparkles className="h-3.5 w-3.5" /> NOTORIETÀ VERIFICATA
                </span>
              )}
              {/* B3: disponibile per ingaggi reali (solo se il consenso e' attivo). */}
              {availableForBooking && status === "ATTIVO" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[0.7rem] font-bold tracking-wide text-teal">
                  <Handshake className="h-3.5 w-3.5" /> DISPONIBILE PER INGAGGI
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight">{avatar.alias}</h1>
            <p className="mb-1 text-sm text-muted">@{avatar.handle}</p>
            {/* Nome e cognome PUBBLICO: compare solo se la persona lo dichiara */}
            {avatar.real_name && (
              <p className="mb-1 text-sm font-semibold text-foreground/90">{avatar.real_name}</p>
            )}
            {(avatar.instagram || avatar.facebook) && (
              <div className="mb-3 mt-1 flex flex-wrap gap-2">
                {avatar.instagram && <SocialPill kind="instagram" value={avatar.instagram} />}
                {avatar.facebook && <SocialPill kind="facebook" value={avatar.facebook} />}
              </div>
            )}
            {!avatar.real_name && !avatar.instagram && !avatar.facebook && <div className="mb-2" />}

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1" style={{ background: tier.bg, borderColor: `${tier.color}44` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: tier.color }} />
              <span className="text-xs font-bold tracking-wide" style={{ color: tier.color }}>{tier.label}</span>
              <span className="text-xs" style={{ color: `${tier.color}99` }}>· {tier.description}</span>
            </div>

            <div>
              {status === "ATTIVO" ? (
                <span className="inline-block rounded-full border border-green/30 bg-green/10 px-4 py-1 text-sm font-bold tracking-wide text-green">● ATTIVO</span>
              ) : (
                <span className="inline-block rounded-full border border-crimson/40 bg-crimson/10 px-4 py-1 text-sm font-bold tracking-wide text-crimson">✕ REVOCATO</span>
              )}
              {status === "REVOCATO" && (
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-crimson-light">
                  Questa persona ha ritirato il consenso. Il suo volto non è più generabile.
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Atto di proprietà */}
      <motion.div custom={1} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
        className="glass mt-4 overflow-hidden rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-violet-light" />
          <p className="text-xs tracking-[0.1em] text-muted">ATTO DI PROPRIETÀ</p>
          {ownership.soulbound && (
            <span className="rounded-full border border-violet/30 bg-violet/10 px-2 py-0.5 text-[0.62rem] font-bold tracking-wide text-violet-light">SOULBOUND</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-0.5 text-[0.7rem] text-muted">Titolare</p>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              {ownership.owner}
              {ownership.ownerVerified && <BadgeCheck className="h-3.5 w-3.5 text-teal" />}
            </p>
          </div>
          <div>
            <p className="mb-0.5 text-[0.7rem] text-muted">Registrato il</p>
            <p className="text-sm font-semibold">{formatDate(ownership.issued)}</p>
          </div>
          <div className="col-span-2">
            <p className="mb-0.5 text-[0.7rem] text-muted">Token di proprietà</p>
            <code className="rounded bg-violet/10 px-2 py-1 font-mono text-sm text-violet-light">{ownership.tokenShort}</code>
          </div>
        </div>

        {/* Stato ancoraggio on-chain */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-white/[0.02] p-3">
          <Link2 className="h-4 w-4 shrink-0 text-muted" />
          {ownership.tx ? (
            <p className="text-xs text-muted">
              Ancorato su <span className="font-semibold text-foreground capitalize">{ownership.chain ?? "on-chain"}</span> ·{" "}
              <span className="font-mono text-violet-light">{ownership.tx.slice(0, 14)}…</span>
            </p>
          ) : (
            <p className="text-xs text-muted">
              <span className="font-semibold text-foreground">Pronto per l&apos;ancoraggio on-chain</span>, la proprietà verrà ancorata su Base (identità soulbound).
            </p>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-faint">
          Questo è il titolo del volto: <strong className="text-muted">non vendibile</strong> (non si vende la propria identità).
          Le licenze d&apos;uso sono separate e tracciabili, con royalty alla persona a ogni utilizzo.
        </p>
      </motion.div>

      {/* Repertorio */}
      {galleryCount > 0 && (
        <Card i={1} label="REPERTORIO: ESEMPI GENERATI">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: galleryCount }).map((_, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={idx} src={`/api/sample/${avatar.handle}/${idx}`} alt={`esempio ${idx + 1}`} loading="lazy"
                className="aspect-[3/4] w-full rounded-xl border border-border bg-obsidian-3 object-cover" />
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-faint">
            Immagini generate dal Soul reale di {avatar.alias}, watermarkate. Le generazioni commerciali sono pulite e certificate.
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
            className="block w-full rounded-2xl bg-[#F2A93B] px-8 py-6 text-center text-xl font-extrabold tracking-tight text-[#412402] shadow-[0_12px_50px_rgba(242,169,59,0.4)] transition-all hover:brightness-110 sm:text-2xl"
          >
            ⚡ Genera con questo avatar →
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
          className="glass mt-4 rounded-2xl p-5"
        >
          <div className="mb-2 flex items-center gap-2">
            <Handshake className="h-4 w-4 text-teal" />
            <p className="text-xs tracking-[0.1em] text-muted">INGAGGI REALI</p>
          </div>
          <p className="mb-3 text-sm leading-relaxed text-muted">
            {avatar.alias} e&apos; disponibile per uno shooting reale con la persona vera. Semblic fa da garante: l&apos;AI non sostituisce i modelli, gli procura lavoro.
          </p>
          <Link
            href={`/contatti?ingaggio=${avatar.handle}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/15 px-5 py-2 text-sm font-bold text-teal transition-colors hover:bg-teal/25"
          >
            Richiedi un ingaggio →
          </Link>
        </motion.div>
      )}

      {/* Identity kit */}
      <Card i={2} label="IDENTITY KIT" badge="IMMUTABILE">
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
      <Card i={3} label="TOKEN DI VERIFICA">
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-lg bg-violet/10 px-3 py-2 font-mono text-base tracking-wide text-violet-light">{tokenShort}</code>
          <button onClick={copyToken}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${copied ? "border-teal/40 bg-teal/10 text-teal" : "border-border bg-white/5 text-muted hover:text-foreground"}`}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiato" : "Copia token"}
          </button>
          <Link href="/verify" className="rounded-lg border border-violet/30 bg-violet/10 px-3 py-2 text-sm text-violet-light transition-colors hover:bg-violet/20">Verifica →</Link>
          {/* Badge embeddabile (Fase 4): da qui prendi il codice per metterlo
              sul tuo sito. Solo per i volti attivi: per un revocato il badge
              direbbe "consenso revocato", non ha senso incorporarne uno nuovo. */}
          {!avatar.revoked_at && (
            <Link href={`/badge?handle=${avatar.handle}`} className="rounded-lg border border-teal/30 bg-teal/10 px-3 py-2 text-sm text-teal transition-colors hover:bg-teal/20">Incorpora il badge →</Link>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-faint">
          Identificativo univoco e certificato di questo volto. Prova che è reale.
        </p>
      </Card>

      {/* Timeline — review C4: il consent ledger reso come timeline GRAFICA.
          La linea CONTINUA per i consensi attivi; per i revocati SI INTERROMPE
          alla revoca: l'interruzione è la prova. Solo rendering, zero logica. */}
      <Card i={4} label="TIMELINE DI CONSENSO">
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
                      <span className="block h-[3px] w-[11px] rounded-full bg-crimson shadow-[0_0_10px_rgba(242,149,140,0.5)]" />
                    </span>
                    <p className="text-sm leading-relaxed">
                      <span className="font-bold text-crimson">La timeline si interrompe qui.</span>{" "}
                      <span className="text-muted">Questa persona ha cambiato idea, il sistema ha obbedito. Nessuna generazione futura.</span>
                    </p>
                  </>
                ) : (
                  <>
                    <span className="relative z-10 mt-[4px] h-[11px] w-[11px] shrink-0" aria-hidden>
                      <span className="absolute inset-0 animate-ping rounded-full bg-teal opacity-50 motion-reduce:hidden" />
                      <span className="relative block h-[11px] w-[11px] rounded-full border-2 border-teal bg-teal/30" />
                    </span>
                    <p className="text-sm leading-relaxed">
                      <span className="font-bold text-teal">Consenso attivo.</span>{" "}
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
              <p className="mt-0.5 text-sm font-semibold text-crimson">{formatDate(avatar.revoked_at)}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Consenso all'uso (modello senza categorie: sì/no) */}
      <Card i={5} label="CONSENSO ALL'USO">
        {avatar.revoked_at ? (
          <span className="inline-block rounded-full border border-crimson/25 bg-crimson/10 px-3 py-1 text-sm font-semibold text-crimson">Consenso revocato</span>
        ) : avatar.commercial_consent === false ? (
          <span className="inline-block rounded-full border border-crimson/25 bg-crimson/10 px-3 py-1 text-sm font-semibold text-crimson">Uso commerciale non consentito</span>
        ) : (
          <span className="inline-block rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-sm font-semibold text-teal">✓ Uso commerciale consentito</span>
        )}
        <p className="mt-3 text-xs leading-relaxed text-faint">
          Il consenso è sì o no, non più per categoria: vale per ogni uso commerciale e si può revocare in qualsiasi momento. La revoca è prospettica.
        </p>
      </Card>

      {/* Statistiche */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <p className="mb-1 text-xs tracking-[0.1em] text-muted">UTILIZZI TOTALI</p>
          <p className="text-3xl font-extrabold">{avatar.usage_count.toLocaleString("it-IT")}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="mb-1 text-xs tracking-[0.1em] text-muted">ROYALTY MATURATE</p>
          <p className="text-3xl font-extrabold text-violet-light">€{royaltyEur}</p>
        </div>
      </div>

      {/* Nota legale */}
      <div className="mt-4 rounded-2xl border border-border bg-white/[0.02] p-5">
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
          Questo avatar non rappresenta una persona consenziente? <span className="font-semibold text-crimson">Segnala abuso</span>
        </Link>
      </div>
    </main>
  );
}

// Card di sezione in vetro, con etichetta e badge opzionale + reveal allo scroll.
function Card({ i, label, badge, children }: { i: number; label: string; badge?: string; children: React.ReactNode }) {
  return (
    <motion.section custom={i} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
      className="glass mt-4 rounded-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <p className="text-xs tracking-[0.1em] text-muted">{label}</p>
        {badge && <span className="rounded-full border border-violet/30 bg-violet/10 px-2 py-0.5 text-[0.62rem] font-bold tracking-wide text-violet-light">{badge}</span>}
      </div>
      {children}
    </motion.section>
  );
}
