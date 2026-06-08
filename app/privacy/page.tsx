import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";

export const metadata = {
  title: "Privacy",
  description: "Come Human2AI tratta i dati: privacy by default, nessun dato biometrico esposto, nessuna vendita di dati.",
};

// NB: bozza informativa allineata alle pratiche del prodotto. Da far validare a un legale prima del lancio.
export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />
        <main className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
          <span className="text-xs font-bold tracking-[0.14em] text-violet-light">PRIVACY</span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Informativa privacy</h1>
          <p className="mt-3 text-sm text-faint">Bozza — in fase di revisione legale. Ultimo aggiornamento: 2026.</p>

          <div className="mt-8 flex flex-col gap-6 text-[0.95rem] leading-relaxed text-muted">
            <Section title="Il principio">
              Privacy by default. Trattiamo solo i dati necessari a far funzionare il registro e a tutelare le persone.
              <strong className="text-foreground"> Non vendiamo dati, mai.</strong>
            </Section>
            <Section title="Dati che trattiamo">
              Dati di account (email, nome), stato di verifica dell&apos;identità, dati dell&apos;avatar (alias, handle,
              caratteristiche strutturali dichiarate, categorie d&apos;uso), eventi di consenso, generazioni e relative
              royalty. I documenti d&apos;identità eventualmente caricati per la verifica sono trattati solo per quella
              finalità e non restano esposti.
            </Section>
            <Section title="Le tue foto: dove vivono e per quanto">
              Le foto che carichi per creare l&apos;avatar (il &laquo;reference-set&raquo;) vengono ridimensionate sul tuo
              dispositivo e salvate in uno <strong className="text-foreground">spazio privato e cifrato</strong> (Supabase
              Storage), accessibile solo dai nostri sistemi lato server: non sono mai pubbliche, non finiscono nel codice,
              non vengono indicizzate. Servono unicamente a bloccare l&apos;identità reale nelle generazioni autorizzate.
              <strong className="text-foreground"> Quando revochi il consenso, le foto-reference vengono cancellate</strong>
              (&laquo;cancello, non cassaforte&raquo;): restano solo i certificati anonimi delle generazioni già avvenute,
              come prova. Conserviamo i dati nel territorio dell&apos;Unione Europea ove possibile.
            </Section>
            <Section title="Nessun dato biometrico esposto">
              Non pubblichiamo né esponiamo dati biometrici. Eventuali ancoraggi pubblici (oggi assenti, in futuro su
              blockchain) conterrebbero <strong className="text-foreground">solo hash anonimi</strong>, mai volti, foto o
              documenti.
            </Section>
            <Section title="Il consenso è una timeline">
              Ogni avatar è autorizzato per un periodo e per categorie d&apos;uso specifiche. La revoca è prospettica:
              blocca gli utilizzi futuri, non cancella quelli già avvenuti, che restano tracciati e attribuiti.
            </Section>
            <Section title="I tuoi diritti (GDPR)">
              Accesso, rettifica, cancellazione, limitazione, portabilità e opposizione. Per esercitarli, contattaci
              all&apos;indirizzo indicato sotto. Puoi inoltre revocare il consenso del tuo avatar in ogni momento dalla
              tua area account.
            </Section>
            <Section title="Sicurezza">
              Le credenziali e i dati sensibili sono gestiti lato server e non sono mai esposti al browser. L&apos;accesso
              ai dati è limitato e controllato.
            </Section>
            <Section title="Fornitori che ci aiutano (sub-processor)">
              Per erogare il servizio ci appoggiamo a fornitori selezionati, che trattano i dati solo per nostro conto e
              limitatamente a ciò che serve: <strong className="text-foreground">Supabase</strong> (database, autenticazione
              e archiviazione cifrata delle foto), <strong className="text-foreground">Anthropic (Claude)</strong> — solo se
              scegli di far analizzare le foto per pre-compilare l&apos;identikit, <strong className="text-foreground">OpenAI</strong> e
              <strong className="text-foreground"> Higgsfield</strong> per la generazione delle immagini quando autorizzata.
              Alcuni di questi fornitori hanno sede fuori dall&apos;UE: i trasferimenti avvengono con le garanzie previste dal
              GDPR. Non cediamo i tuoi dati a nessun altro e non li usiamo per addestrare modelli senza il tuo consenso.
            </Section>
            <Section title="Contatti">
              Per qualsiasi richiesta sulla privacy: <span className="text-foreground">privacy@human2ai.example</span>.
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
