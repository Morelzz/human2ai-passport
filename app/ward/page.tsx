import { WardIntro } from "./WardIntro";
import { fotoPagina } from "@/lib/foto-pagine";

// /ward (Ward v2): pagina pubblica di SPIEGAZIONE del finder. Ward v2 trova le
// copie delle immagini GENERATE su Semblic (niente foto/KYC/consenso): si usa
// per-immagine dalle creazioni in /account. Il vecchio ingresso a 3 pannelli
// (proteggi-il-volto + KYC) e' stato staccato da Ward: ora e' "protezione
// identita'" (/tutela, /signup/avatar/protected), un'altra cosa.
export default async function WardPage() {
  return <WardIntro copertina={await fotoPagina("ward")} />;
}
