import { createServerClient } from "@/lib/supabase";

// G — Academy: tipi e accesso al modello dati (supabase/academy.sql).
// Build per gradi: oggi solo lettura corsi per la pagina narrativa; il player
// lezioni/quiz e il gate per piano utente arrivano coi contenuti.

export type CorsoLivello = "base" | "medio" | "avanzato";

export interface Corso {
  id: string;
  slug: string;
  titolo: string;
  descrizione: string | null;
  livello: CorsoLivello;
  pubblico: string;
  requisito_accesso: "free" | "abbonamento" | "pagamento";
  certificante: boolean;
  pubblicato: boolean;
}

// I tre corsi fondativi come fallback (stesse righe del seed in academy.sql):
// la pagina /academy racconta i livelli anche se la migrazione non è applicata.
export const CORSI_FALLBACK: Corso[] = [
  {
    id: "",
    slug: "benvenuti-in-semblic",
    titolo: "Benvenuti in SEMBLIC",
    descrizione: "Cos'è il registro, come funziona il consenso, i tier, i tuoi diritti d'immagine spiegati semplici.",
    livello: "base",
    pubblico: "tutti",
    requisito_accesso: "free",
    certificante: false,
    pubblicato: false,
  },
  {
    id: "",
    slug: "creare-con-i-volti-veri",
    titolo: "Creare con i volti veri",
    descrizione: "Prompt efficaci, uso avanzato della piattaforma, workflow creativi con gli LLM.",
    livello: "medio",
    pubblico: "buyer e creator",
    requisito_accesso: "abbonamento",
    certificante: false,
    pubblicato: false,
  },
  {
    id: "",
    slug: "protocollo-semblic-scan",
    titolo: "Il protocollo SEMBLIC-SCAN",
    descrizione: "Il percorso Capture Partner: esecuzione, consenso on-site, postproduzione, esame finale. Chi lo supera entra nella rete.",
    livello: "avanzato",
    pubblico: "professionisti",
    requisito_accesso: "pagamento",
    certificante: true,
    pubblicato: false,
  },
];

// Tutti i corsi, in ordine di livello. Difensivo: tabella assente → fallback.
export async function getCorsi(): Promise<Corso[]> {
  const sb = createServerClient();
  const { data, error } = await sb.from("corsi").select("*");
  const ordine: Record<CorsoLivello, number> = { base: 0, medio: 1, avanzato: 2 };
  if (error || !data || data.length === 0) return CORSI_FALLBACK;
  return (data as Corso[]).sort((a, b) => ordine[a.livello] - ordine[b.livello]);
}
