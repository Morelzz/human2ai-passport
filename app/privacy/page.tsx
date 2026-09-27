import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { LegalNotice } from "@/components/legal/LegalNotice";

import { TestataTesto } from "@/components/marketing/pagine/TestataTesto";
import { Capitoli } from "@/components/marketing/pagine/Capitoli";
import { Voce, idDa, titoloBreve } from "@/components/marketing/pagine/Voce";

const CAPITOLI = ["Il principio", "Titolare del trattamento", "Base giuridica: e perché qui è speciale", "Dati che raccogliamo", "Conservazione: quanto teniamo cosa", "Le tue foto: dove vivono e per quanto", "Nessun dato biometrico esposto", "Il consenso è una timeline", "I tuoi diritti (GDPR)", "Trasparenza sui contenuti sintetici (EU AI Act)", "Sicurezza", "Fornitori che ci aiutano (sub-processor)", "Contatti e DPO"].map((t) => ({ id: idDa(t), titolo: titoloBreve(t) }));

export const metadata = {
  title: "Privacy policy",
  description: "Come Semblic tratta i dati: privacy by default, nessun dato biometrico esposto, nessuna vendita di dati.",
};

// NB: bozza informativa allineata alle pratiche del prodotto. Da far validare a un legale prima del lancio.
export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />
        <TestataTesto occhiello="Privacy" titolo="Informativa privacy" dato="bozza in revisione legale" />
        <main className="pb-20 sm:pb-28">
          <Capitoli capitoli={CAPITOLI}>
          <LegalNotice />
          <div className="mt-10 flex flex-col gap-10">
            <Voce titolo="Il principio">
              Privacy by default. Trattiamo solo i dati necessari a far funzionare il registro e a tutelare le persone.
              <strong className="text-foreground"> Non vendiamo dati, mai.</strong>
            </Voce>
            <Voce titolo="Titolare del trattamento">
              Il titolare del trattamento è <span className="font-mono text-[0.82rem] text-faint">[DA AVVOCATO: denominazione,
              sede legale, P.IVA della società una volta costituita]</span>. Fino ad allora, il riferimento operativo è il
              fondatore della piattaforma, raggiungibile ai contatti in fondo a questa pagina.
            </Voce>
            <Voce titolo="Base giuridica: e perché qui è speciale">
              Il cuore della piattaforma sono <strong className="text-foreground">dati biometrici</strong>{" "}(il tuo volto, le
              foto di referenza, il selfie di verifica): per il GDPR sono &laquo;categorie particolari&raquo; (Art. 9) e li
              trattiamo <strong className="text-foreground">solo con il tuo consenso esplicito</strong>, raccolto al momento
              della creazione dell&apos;avatar e revocabile in ogni momento. Per i dati di account vale il contratto
              (Art. 6.1.b); per sicurezza e prevenzione abusi il legittimo interesse (Art. 6.1.f).
              <span className="mt-2 block font-mono text-[0.78rem] text-faint">[DA AVVOCATO: formula di consenso esplicito e DPIA, valutazione d&apos;impatto ex Art. 35]</span>
            </Voce>
            <Voce titolo="Dati che raccogliamo">
              Dati di account (email, nome), <strong className="text-foreground">immagini del volto</strong>{" "}(le foto di
              referenza che carichi), <strong className="text-foreground">documento d&apos;identità e selfie/video di
              liveness</strong>{" "}per la verifica KYC, dati dell&apos;avatar (alias, caratteristiche dichiarate, categorie
              d&apos;uso), eventi di consenso, generazioni, royalty e payout.
            </Voce>
            <Voce titolo="Conservazione: quanto teniamo cosa">
              Dati di account: finché l&apos;account è attivo. Foto di referenza:{" "}
              <strong className="text-foreground">cancellate alla revoca del consenso</strong>{" "}(&laquo;cancello, non
              cassaforte&raquo;). Documenti KYC: solo il tempo necessario alla verifica e agli obblighi di legge{" "}
              <span className="font-mono text-[0.78rem] text-faint">[DA AVVOCATO: termine esatto]</span>. Certificati delle
              generazioni: permanenti, perché sono la prova, ma sono hash anonimi, non dati personali.
            </Voce>
            <Voce titolo="Le tue foto: dove vivono e per quanto">
              Le foto che carichi per creare l&apos;avatar (il &laquo;reference-set&raquo;) vengono ridimensionate sul tuo
              dispositivo e salvate in uno <strong className="text-foreground">spazio privato e cifrato</strong>{" "}(Supabase
              Storage), accessibile solo dai nostri sistemi lato server: non sono mai pubbliche, non finiscono nel codice,
              non vengono indicizzate. Servono unicamente a bloccare l&apos;identità reale nelle generazioni autorizzate.
              <strong className="text-foreground"> Quando revochi il consenso, le foto-reference vengono cancellate</strong>{" "}
              (&laquo;cancello, non cassaforte&raquo;): restano solo i certificati anonimi delle generazioni già avvenute,
              come prova. Conserviamo i dati nel territorio dell&apos;Unione Europea ove possibile.
            </Voce>
            <Voce titolo="Nessun dato biometrico esposto">
              Non pubblichiamo né esponiamo dati biometrici. Eventuali ancoraggi pubblici (oggi assenti, in futuro su
              blockchain) conterrebbero <strong className="text-foreground">solo hash anonimi</strong>, mai volti, foto o
              documenti.
            </Voce>
            <Voce titolo="Il consenso è una timeline">
              Ogni avatar è autorizzato per un periodo e per categorie d&apos;uso specifiche. La revoca è prospettica:
              blocca gli utilizzi futuri, non cancella quelli già avvenuti, che restano tracciati e attribuiti.
            </Voce>
            <Voce titolo="I tuoi diritti (GDPR)">
              Accesso, rettifica, cancellazione, limitazione, portabilità, opposizione e{" "}
              <strong className="text-foreground">revoca del consenso in ogni momento</strong>{" "}(dalla tua area account,
              con effetto immediato e prospettico). Hai inoltre il diritto di proporre reclamo al Garante per la
              protezione dei dati personali (gpdp.it). Per esercitare i diritti, contattaci all&apos;indirizzo in fondo.
            </Voce>
            <Voce titolo="Trasparenza sui contenuti sintetici (EU AI Act)">
              Ogni immagine generata dalla piattaforma esce <strong className="text-foreground">dichiaratamente
              sintetica</strong>: porta un certificato verificabile, una filigrana invisibile e metadati di provenienza.
              È la direzione degli obblighi di trasparenza dell&apos;AI Act europeo, per noi non è un adempimento,
              è il prodotto. <span className="font-mono text-[0.78rem] text-faint">[DA AVVOCATO: mappatura puntuale degli obblighi di etichettatura applicabili]</span>
            </Voce>
            <Voce titolo="Sicurezza">
              Le credenziali e i dati sensibili sono gestiti lato server e non sono mai esposti al browser. L&apos;accesso
              ai dati è limitato e controllato.
            </Voce>
            <Voce titolo="Fornitori che ci aiutano (sub-processor)">
              Per erogare il servizio ci appoggiamo a fornitori selezionati, che trattano i dati solo per nostro conto e
              limitatamente a ciò che serve: <strong className="text-foreground">Supabase</strong>{" "}(database, autenticazione
              e archiviazione cifrata delle foto), <strong className="text-foreground">Didit</strong>{" "}(verifica
              dell&apos;identità), <strong className="text-foreground">Anthropic (Claude)</strong>{" "}per analizzare le foto e
              pre-compilare l&apos;identikit, solo se lo scegli, per leggere il testo della scena che scrivi e scegliere i
              volti adatti, per leggere la scena contro i limiti che una persona ha scritto sul proprio volto, e per
              controllare ogni immagine generata prima della consegna (riceve l&apos;immagine generata, mai le foto
              originali delle persone), <strong className="text-foreground">OpenAI</strong>{" "}(ECHO, gpt-image) per
              la generazione delle immagini quando autorizzata, <strong className="text-foreground">Higgsfield</strong>{" "}per
              trasformare uno scatto certificato in video, solo con il consenso al video della persona, e{" "}
              <strong className="text-foreground">Google Cloud Vision</strong>{" "}per cercare online le copie delle immagini dei
              volti protetti da Ward, <strong className="text-foreground">Vercel</strong>{" "}(hosting del sito e misura
              delle visite senza cookie e senza identificatori) e <strong className="text-foreground">Railway</strong>{" "}(il
              server che esegue le generazioni).
              Alcuni di questi fornitori hanno sede fuori dall&apos;UE: i trasferimenti avvengono con le garanzie previste dal
              GDPR. Non cediamo i tuoi dati a nessun altro e non li usiamo per addestrare modelli senza il tuo consenso.
            </Voce>
            <Voce titolo="Contatti e DPO">
              Per qualsiasi richiesta sulla privacy (accesso, rettifica, cancellazione, opposizione):{" "}
              <a href="/contatti?oggetto=privacy" className="text-amber-ink underline underline-offset-4">scrivici dal modulo contatti</a>, oggetto Privacy.
              Responsabile della protezione dei dati (DPO):{" "}
              <span className="font-mono text-[0.78rem] text-faint">[DA AVVOCATO: nomina del DPO se dovuta ex Art. 37, probabile, dato il trattamento biometrico su larga scala]</span>.
            </Voce>
          </div>
          </Capitoli>
        </main>
        <Footer />
      </div>
    </div>
  );
}
