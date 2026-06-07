"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Copy, Check, ShieldCheck, BadgeCheck, AlertTriangle } from "lucide-react";
import { Avatar, ConsentEvent, IDENTITY_KIT, IDENTITY_LABELS } from "@/lib/types";

interface Props {
  avatar: Avatar;
  events: ConsentEvent[];
  status: "ATTIVO" | "REVOCATO";
  tier: { label: string; color: string; bg: string; description: string };
  tokenShort: string;
  ownerVerified?: boolean;
  galleryCount?: number;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const } }),
};

export default function PassportClient({ avatar, events, status, tier, tokenShort, ownerVerified, galleryCount = 0 }: Props) {
  const [copied, setCopied] = useState(false);

  function copyToken() {
    navigator.clipboard.writeText(avatar.token_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const royaltyEur = (avatar.royalty_accrued_cents / 100).toFixed(2);
  // Mario ha un ritratto reale via route interna; gli altri usano il portrait.
  const portrait = avatar.handle === "mario-r" ? "/api/sample/mario-r/0" : avatar.portrait_url;

  const labels: Record<string, string> = {
    GRANTED: "Consenso concesso",
    CATEGORY_ADDED: "Categoria aggiunta",
    CATEGORY_REMOVED: "Categoria rimossa",
    REVOKED: "Revoca del consenso",
  };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      {/* Header card */}
      <motion.div custom={0} variants={fade} initial="hidden" animate="show" className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(70% 90% at 15% 0%, ${tier.color}22, transparent 65%)` }} />
        <div className="relative flex flex-wrap items-start gap-6">
          {/* Portrait */}
          <div className="shrink-0">
            <div className="h-28 w-28 overflow-hidden rounded-2xl border bg-obsidian-3" style={{ borderColor: `${tier.color}55` }}>
              {portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portrait} alt={avatar.alias} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">👤</div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="min-w-[200px] flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[0.7rem] font-bold tracking-wide text-teal">
                <ShieldCheck className="h-3.5 w-3.5" /> HUMAN2AI VERIFIED
              </span>
              {ownerVerified && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-[0.7rem] font-bold tracking-wide text-violet-light">
                  <BadgeCheck className="h-3.5 w-3.5" /> PERSONA REALE VERIFICATA
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight">{avatar.alias}</h1>
            <p className="mb-3 text-sm text-muted">@{avatar.handle}</p>

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1" style={{ background: tier.bg, borderColor: `${tier.color}44` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: tier.color }} />
              <span className="text-xs font-bold tracking-wide" style={{ color: tier.color }}>{tier.label}</span>
              <span className="text-xs" style={{ color: `${tier.color}99` }}>— {tier.description}</span>
            </div>

            <div>
              {status === "ATTIVO" ? (
                <span className="inline-block rounded-full border border-green/30 bg-green/10 px-4 py-1 text-sm font-bold tracking-wide text-green">● ATTIVO</span>
              ) : (
                <span className="inline-block rounded-full border border-crimson/40 bg-crimson/10 px-4 py-1 text-sm font-bold tracking-wide text-crimson">✕ REVOCATO</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Repertorio */}
      {galleryCount > 0 && (
        <Card i={1} label="REPERTORIO — ESEMPI GENERATI">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: galleryCount }).map((_, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={idx} src={`/api/sample/${avatar.handle}/${idx}`} alt={`esempio ${idx + 1}`} loading="lazy"
                className="aspect-[3/4] w-full rounded-xl border border-white/8 bg-obsidian-3 object-cover" />
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-faint">
            Immagini generate dal Soul reale di {avatar.alias}, watermarkate. Le generazioni commerciali sono pulite e certificate.
          </p>
        </Card>
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
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${copied ? "border-teal/40 bg-teal/10 text-teal" : "border-white/10 bg-white/5 text-muted hover:text-foreground"}`}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiato" : "Copia token"}
          </button>
          <Link href="/verify" className="rounded-lg border border-violet/30 bg-violet/10 px-3 py-2 text-sm text-violet-light transition-colors hover:bg-violet/20">Verifica →</Link>
        </div>
      </Card>

      {/* Timeline */}
      <Card i={4} label="TIMELINE DI CONSENSO">
        <div className="flex flex-col gap-3">
          {events.map((ev) => {
            const isRevoked = ev.event_type === "REVOKED";
            return (
              <div key={ev.id} className="flex items-center gap-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${isRevoked ? "bg-crimson" : "bg-teal"}`} />
                <span className={`text-sm font-semibold ${isRevoked ? "text-crimson" : "text-teal"}`}>{labels[ev.event_type]}</span>
                {ev.detail && <span className="text-sm text-muted">— {ev.detail}</span>}
                <span className="ml-auto text-sm text-faint">{formatDate(ev.occurred_at)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-8 border-t border-white/6 pt-4">
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

      {/* Categorie */}
      <Card i={5} label="CATEGORIE DI UTILIZZO">
        <p className="mb-2 text-sm text-muted">Consentite</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {avatar.approved_categories.map((cat) => (
            <span key={cat} className="rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-sm font-semibold text-teal">✓ {cat}</span>
          ))}
        </div>
        <p className="mb-2 text-sm text-muted">Escluse</p>
        <div className="flex flex-wrap gap-2">
          {avatar.excluded_categories.map((cat) => (
            <span key={cat} className="rounded-full border border-crimson/25 bg-crimson/10 px-3 py-1 text-sm font-semibold text-crimson line-through">{cat}</span>
          ))}
        </div>
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
      <div className="mt-4 rounded-2xl border border-white/6 bg-white/[0.02] p-5">
        <p className="text-xs leading-relaxed text-faint">
          Questo soggetto è una persona reale che ha dato consenso esplicito all&apos;utilizzo della propria immagine nelle categorie indicate.
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
