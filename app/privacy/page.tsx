import { SiteNav } from "@/components/marketing/SiteNav";
import { CineBackground } from "@/components/marketing/CineBackground";
import { LegalNotice } from "@/components/legal/LegalNotice";

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
          <LegalNotice />

          <div className="mt-8 flex flex-col gap-6 text-[0.95rem] leading-relaxed text-muted">
            <Section title="Il principio">
              Privacy by default. Trattiamo solo i dati necessari a far funzionare il registro e a tutelare le persone.
              <strong className="text-foreground"> Non vendiamo dati, mai.</strong>
            </Section>
            <Section title="Titolare del trattamento">
              Il titolare del trattamento è <span className="font-mono text-[0.82rem] text-faint">[DA AVVOCATO: denominazione,
              sede legale, P.IVA della società una volta costituita]</span>. Fino ad allora, il riferimento operativo è il
              fondatore della piattaforma, raggiungibile ai contatti in fondo a questa pagina.
            </Section>
            <Section title="Base giuridica — e perché qui è speciale">
              Il cuore della piattaforma sono <strong className="text-foreground">dati biometrici</strong> (il tuo volto, le
              foto di referenza, il selfie di verifica): per il GDPR sono &laquo;categorie particolari&raquo; (Art. 9) e li
              trattiamo <strong className="text-foreground">solo con il tuo consenso esplicito</strong>, raccolto al momento
              della creazione dell&apos;avatar e revocabile in ogni momento. Per i dati di account vale il contratto
              (Art. 6.1.b); per sicurezza e prevenzione abusi il legittimo interesse (Art. 6.1.f).
              <span className="mt-2 block font-mono text-[0.78rem] text-faint">[DA AVVOCATO: formula di consenso esplicito e DPIA — valutazione d&apos;impatto ex Art. 35]</span>
            </Section>
            <Section title="Dati che raccogliamo">
              Dati di account (email, nome), <strong className="text-foreground">immagini del volto</strong> (le foto di
              referenza che carichi), <strong className="text-foreground">documento d&apos;identità e selfie/video di
              liveness</strong> per la verifica KYC, dati dell&apos;avatar (alias, caratteristiche dichiarate, categorie
              d&apos;uso), eventi di consenso, generazioni, royalty e payout.
            </Section>
            <Section title="Conservazione: quanto teniamo cosa">
              Dati di account: finché l&apos;account è attivo. Foto di referenza:{" "}
              <strong className="text-foreground">cancellate alla revoca del consenso</strong> (&laquo;cancello, non
              cassaforte&raquo;). Documenti KYC: solo il tempo necessario alla verifica e agli obblighi di legge{" "}
              <span className="font-mono text-[0.78rem] text-faint">[DA AVVOCATO: termine esatto]</span>. Certificati delle
              generazioni: permanenti, perché sono la prova — ma sono hash anonimi, non dati personali.
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
              Accesso, rettifica, cancellazione, limitazione, portabilità, opposizione e{" "}
              <strong className="text-foreground">revoca del consenso in ogni momento</strong> (dalla tua area account,
              con effetto immediato e prospettico). Hai inoltre il diritto di proporre reclamo al Garante per la
              protezione dei dati personali (gpdp.it). Per esercitare i diritti, contattaci all&apos;indirizzo in fondo.
            </Section>
            <Section title="Trasparenza sui contenuti sintetici (EU AI Act)">
              Ogni immagine generata dalla piattaforma esce <strong className="text-foreground">dichiaratamente
              sintetica</strong>: porta un certificato verificabile, una filigrana invisibile e metadati di provenienza.
              È la direzione degli obblighi di trasparenza dell&apos;AI Act europeo — per noi non è un adempimento,
              è il prodotto. <span className="font-mono text-[0.78rem] text-faint">[DA AVVOCATO: mappatura puntuale degli obblighi di etichettatura applicabili]</span>
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
            <Section title="Contatti e DPO">
              Per qualsiasi richiesta sulla privacy: <span className="text-foreground">privacy@human2ai.example</span>{" "}
              <span className="font-mono text-[0.78rem] text-faint">[DA CONFERMARE: indirizzo definitivo]</span>.
              Responsabile della protezione dei dati (DPO):{" "}
              <span className="font-mono text-[0.78rem] text-faint">[DA AVVOCATO: nomina del DPO se dovuta ex Art. 37 — probabile, dato il trattamento biometrico su larga scala]</span>.
              Puoi anche scriverci dalla pagina <a href="/contatti" className="text-violet-light underline">/contatti</a>.
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
