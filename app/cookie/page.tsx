import Link from "next/link";
import { SiteNav } from "@/components/marketing/SiteNav";
import { Footer } from "@/components/marketing/Footer";
import { LegalNotice } from "@/components/legal/LegalNotice";
import { ManageCookiesButton } from "@/components/legal/CookieBanner";

import { TestataTesto } from "@/components/marketing/pagine/TestataTesto";
import { Capitoli } from "@/components/marketing/pagine/Capitoli";
import { Voce, idDa, titoloBreve } from "@/components/marketing/pagine/Voce";

const CAPITOLI = ["Il principio", "Cookie essenziali (sempre attivi)", "Cookie di statistica (oggi: nessuno)", "Gestire le preferenze", "Titolare e contatti"].map((t) => ({ id: idDa(t), titolo: titoloBreve(t) }));

export const metadata = {
  title: "Cookie policy",
  description: "Quali cookie usa Semblic e perché: solo essenziali, niente profilazione, niente pubblicità.",
};

// F1 — cookie policy. Bozza in revisione legale (vedi LegalNotice).
export default function CookiePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
<div className="relative z-[2]">
        <SiteNav />
        <TestataTesto occhiello="Cookie" titolo="Cookie policy" dato="niente profilazione" />
        <main className="pb-20 sm:pb-28">
          <Capitoli capitoli={CAPITOLI}>
          <LegalNotice />
          <div className="mt-10 flex flex-col gap-10">
            <Voce titolo="Il principio">
              Usiamo solo i cookie che servono a far funzionare la piattaforma.
              <strong className="text-foreground"> Niente profilazione, niente pubblicità, niente tracciamento di terze parti.</strong>{" "}
              Per questo il banner che hai visto non ha trucchi: rifiutare è facile quanto accettare.
            </Voce>
            <Voce titolo="Cookie essenziali (sempre attivi)">
              Sono i cookie tecnici senza cui il sito non funziona, e non richiedono consenso:
              i cookie di <strong className="text-foreground">sessione</strong>{" "}(Supabase Auth, per tenerti
              collegato in sicurezza), la <strong className="text-foreground">memoria delle tue preferenze</strong>{" "}
              (incluse quelle sui cookie stessi) e il segnalibro &laquo;contenuti già visti&raquo; che fa
              funzionare le notifiche dei tuoi contenuti. Durano il tempo strettamente necessario.
            </Voce>
            <Voce titolo="Cookie di statistica (oggi: nessuno)">
              Al momento <strong className="text-foreground">non usiamo alcun cookie di statistica o analytics</strong>.
              La scelta che esprimi nel banner viene salvata e, se in futuro introdurremo statistiche
              anonime, varrà la tua preferenza: niente si attiva senza il tuo sì.
            </Voce>
            <Voce titolo="Gestire le preferenze">
              Puoi rivedere la tua scelta in ogni momento da qui, oppure cancellando i dati di navigazione
              del browser. <span className="mt-3 block"><ManageCookiesButton /></span>
            </Voce>
            <Voce titolo="Titolare e contatti">
              Il titolare del trattamento è indicato nell&apos;<Link href="/privacy" className="text-amber-ink underline">informativa privacy</Link>.
              Per qualsiasi domanda sui cookie:{" "}
              <a href="/contatti?oggetto=privacy" className="text-amber-ink underline underline-offset-4">scrivici dal modulo contatti</a>, oggetto Privacy.
            </Voce>
          </div>
          </Capitoli>
        </main>
        <Footer />
      </div>
    </div>
  );
}
