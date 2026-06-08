import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";

export const metadata = {
  title: "Termini",
  description: "Termini di servizio di Human2AI: registro dei volti consenzienti, licenze d'uso, royalty, revoca.",
};

// NB: bozza informativa allineata alle pratiche del prodotto. Da far validare a un legale prima del lancio.
export default function TerminiPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-foreground">
      <CineBackground />
      <div className="relative z-[2]">
        <SiteNav />
        <main className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
          <span className="text-xs font-bold tracking-[0.14em] text-violet-light">TERMINI</span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Termini di servizio</h1>
          <p className="mt-3 text-sm text-faint">Bozza — in fase di revisione legale. Ultimo aggiornamento: 2026.</p>

          <div className="mt-8 flex flex-col gap-6 text-[0.95rem] leading-relaxed text-muted">
            <Section title="Cos'è Human2AI">
              Un registro di identità reali e consenzienti. Una persona rivendica il proprio volto, dichiara come può
              essere usato, e ogni utilizzo è verificabile tramite token. I motori di generazione sono terze parti.
            </Section>
            <Section title="Chi mette il proprio volto (creatori)">
              Dichiari di essere la persona reale rappresentata, di avere il diritto di concederne l&apos;uso, e di voler
              ricevere royalty sugli utilizzi. Puoi revocare il consenso in ogni momento, con effetto prospettico.
              Un&apos;identità verificata corrisponde a un avatar (le agenzie verificate possono gestirne più d&apos;uno).
            </Section>
            <Section title="Chi genera (clienti)">
              Puoi generare solo da avatar consenzienti e solo nelle categorie d&apos;uso autorizzate. Ogni generazione
              commerciale produce un certificato verificabile e remunera la persona reale. È vietato usare i contenuti
              fuori dalle categorie concesse o per finalità illecite, diffamatorie o ingannevoli.
            </Section>
            <Section title="Le tue foto e il reference-set">
              Le foto che carichi servono solo a rappresentare fedelmente la tua identità nelle generazioni che autorizzi.
              Restano private e cifrate, non vengono cedute né usate per addestrare modelli senza il tuo consenso. Quando
              revochi il consenso le foto-reference vengono <strong className="text-foreground">cancellate</strong>; i
              certificati delle generazioni già avvenute restano come prova (la revoca è prospettica). Caricando dichiari di
              avere il pieno diritto sulle immagini e di essere la persona rappresentata.
            </Section>
            <Section title="Royalty e pagamenti">
              Su ogni generazione commerciale la persona reale riceve una quota maggioritaria (royalty), la piattaforma
              una fee. Gli importi maturano in un wallet con payout a soglia. I prezzi dipendono dalla categoria d&apos;uso.
            </Section>
            <Section title="Divieti e enforcement">
              Sono vietati impersonazione, caricamento di volti altrui senza diritto, e usi non consentiti. Chiunque può
              segnalare un abuso; le segnalazioni accolte comportano la rimozione dell&apos;avatar dal registro pubblico.
            </Section>
            <Section title="Limitazioni">
              Il servizio è fornito &quot;così com&apos;è&quot;. SPARK/SHAPE indicano somiglianze &quot;ispirate a&quot;;
              SOUL/HUMAN sono ad alta fedeltà / identity-locked. La responsabilità sull&apos;uso finale dei contenuti
              ricade su chi genera.
            </Section>
            <Section title="Contatti">
              Per questioni contrattuali: <span className="text-foreground">legal@human2ai.example</span>.
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
