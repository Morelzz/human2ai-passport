import Link from "next/link";
import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { LegalNotice } from "@/components/legal/LegalNotice";
import { ManageCookiesButton } from "@/components/legal/CookieBanner";

export const metadata = {
  title: "Cookie policy",
  description: "Quali cookie usa Semblic e perché: solo essenziali, niente profilazione, niente pubblicità.",
};

// F1 — cookie policy. Bozza in revisione legale (vedi LegalNotice).
export default function CookiePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />
        <main className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
          <span className="text-xs font-bold tracking-[0.14em] text-violet-light">COOKIE</span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Cookie policy</h1>
          <LegalNotice />

          <div className="mt-8 flex flex-col gap-6 text-[0.95rem] leading-relaxed text-muted">
            <Section title="Il principio">
              Usiamo solo i cookie che servono a far funzionare la piattaforma.
              <strong className="text-foreground"> Niente profilazione, niente pubblicità, niente tracciamento di terze parti.</strong>{" "}
              Per questo il banner che hai visto non ha trucchi: rifiutare è facile quanto accettare.
            </Section>
            <Section title="Cookie essenziali (sempre attivi)">
              Sono i cookie tecnici senza cui il sito non funziona, e non richiedono consenso:
              i cookie di <strong className="text-foreground">sessione</strong> (Supabase Auth, per tenerti
              collegato in sicurezza), la <strong className="text-foreground">memoria delle tue preferenze</strong>{" "}
              (incluse quelle sui cookie stessi) e il segnalibro &laquo;contenuti già visti&raquo; che fa
              funzionare le notifiche dei tuoi contenuti. Durano il tempo strettamente necessario.
            </Section>
            <Section title="Cookie di statistica (oggi: nessuno)">
              Al momento <strong className="text-foreground">non usiamo alcun cookie di statistica o analytics</strong>.
              La scelta che esprimi nel banner viene salvata e, se in futuro introdurremo statistiche
              anonime, varrà la tua preferenza: niente si attiva senza il tuo sì.
            </Section>
            <Section title="Gestire le preferenze">
              Puoi rivedere la tua scelta in ogni momento da qui, oppure cancellando i dati di navigazione
              del browser. <span className="mt-3 block"><ManageCookiesButton /></span>
            </Section>
            <Section title="Titolare e contatti">
              Il titolare del trattamento è indicato nell&apos;<Link href="/privacy" className="text-violet-light underline">informativa privacy</Link>.
              Per qualsiasi domanda sui cookie: <span className="text-foreground">privacy@semblic.example</span>{" "}
              <span className="font-mono text-[0.78rem] text-faint">[DA CONFERMARE: indirizzo definitivo]</span>.
            </Section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="mb-2 text-lg font-bold text-foreground">{title}</h2>
      <p className="m-0">{children}</p>
    </section>
  );
}
