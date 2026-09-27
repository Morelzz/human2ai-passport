import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { LegalNotice } from "@/components/legal/LegalNotice";

import { TestataTesto } from "@/components/marketing/pagine/TestataTesto";
import { Capitoli } from "@/components/marketing/pagine/Capitoli";
import { Voce, idDa, titoloBreve } from "@/components/marketing/pagine/Voce";

const CAPITOLI = ["Cos'è Semblic", "Chi mette il proprio volto (creatori)", "Chi genera (clienti)", "Le tue foto e il reference-set", "Natura della licenza: concessione, mai cessione", "Royalty e pagamenti", "Divieti e enforcement", "Limitazioni", "Responsabilità e foro competente", "Contatti"].map((t) => ({ id: idDa(t), titolo: titoloBreve(t) }));

export const metadata = {
  title: "Termini di servizio",
  description: "Termini di servizio di Semblic: registro dei volti consenzienti, licenze d'uso, royalty, revoca.",
};

// NB: bozza informativa allineata alle pratiche del prodotto. Da far validare a un legale prima del lancio.
export default function TerminiPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />
        <TestataTesto occhiello="Termini" titolo="Termini di servizio" dato="bozza in revisione legale" />
        <main className="pb-20 sm:pb-28">
          <Capitoli capitoli={CAPITOLI}>
          <LegalNotice />
          <div className="mt-10 flex flex-col gap-10">
            <Voce titolo="Cos'è Semblic">
              Un registro di identità reali e consenzienti. Una persona rivendica il proprio volto, dichiara come può
              essere usato, e ogni utilizzo è verificabile tramite token. I motori di generazione sono terze parti.
            </Voce>
            <Voce titolo="Chi mette il proprio volto (creatori)">
              Dichiari di essere la persona reale rappresentata, di avere il diritto di concederne l&apos;uso, e di voler
              ricevere royalty sugli utilizzi. Puoi revocare il consenso in ogni momento, con effetto prospettico.
              Un&apos;identità verificata corrisponde a un avatar (le agenzie verificate possono gestirne più d&apos;uno).
            </Voce>
            <Voce titolo="Chi genera (clienti)">
              Puoi generare solo da avatar consenzienti e solo nelle categorie d&apos;uso autorizzate. Ogni generazione
              commerciale produce un certificato verificabile e remunera la persona reale. È vietato usare i contenuti
              fuori dalle categorie concesse o per finalità illecite, diffamatorie o ingannevoli.
            </Voce>
            <Voce titolo="Le tue foto e il reference-set">
              Le foto che carichi servono solo a rappresentare fedelmente la tua identità nelle generazioni che autorizzi.
              Restano private e cifrate, non vengono cedute né usate per addestrare modelli senza il tuo consenso. Quando
              revochi il consenso le foto-reference vengono <strong className="text-foreground">cancellate</strong>; i
              certificati delle generazioni già avvenute restano come prova (la revoca è prospettica). Caricando dichiari di
              avere il pieno diritto sulle immagini e di essere la persona rappresentata.
            </Voce>
            <Voce titolo="Natura della licenza: concessione, mai cessione">
              Generando ottieni una <strong className="text-foreground">licenza d&apos;uso</strong>{" "}del contenuto, nei
              limiti della categoria autorizzata. <strong className="text-foreground">Il volto resta della persona,
              sempre</strong>: nessun utilizzo trasferisce la titolarità dell&apos;immagine, e l&apos;identità non è
              vendibile né cedibile, né dalla persona, né da noi, né da te.
              <span className="mt-2 block font-mono text-[0.78rem] text-faint">[DA AVVOCATO: clausole puntuali della licenza: durata, territorio, sublicenza]</span>
            </Voce>
            <Voce titolo="Royalty e pagamenti">
              Su ogni generazione commerciale la persona reale riceve una quota maggioritaria (royalty), la piattaforma
              una fee. Gli importi maturano in un wallet con payout a soglia. I prezzi dipendono dalla categoria d&apos;uso.
            </Voce>
            <Voce titolo="Divieti e enforcement">
              Sono vietati impersonazione, caricamento di volti altrui senza diritto, e usi non consentiti. Chiunque può
              segnalare un abuso; le segnalazioni accolte comportano la rimozione dell&apos;avatar dal registro pubblico.
            </Voce>
            <Voce titolo="Limitazioni">
              Il servizio è fornito &quot;così com&apos;è&quot;. SPARK/SHAPE indicano somiglianze &quot;ispirate a&quot;;
              SOUL/HUMAN sono ad alta fedeltà / identity-locked. La responsabilità sull&apos;uso finale dei contenuti
              ricade su chi genera.
            </Voce>
            <Voce titolo="Responsabilità e foro competente">
              <span className="font-mono text-[0.82rem] text-faint">[DA AVVOCATO: clausole su limitazione di
              responsabilità, manleva, legge applicabile e foro competente, volutamente non redatte in bozza]</span>
            </Voce>
            <Voce titolo="Contatti">
              Per questioni contrattuali:{" "}
              <a href="/contatti?oggetto=legale" className="text-amber-ink underline underline-offset-4">scrivici dal modulo contatti</a>, oggetto Legale.
            </Voce>
          </div>
          </Capitoli>
        </main>
        <Footer />
      </div>
    </div>
  );
}
