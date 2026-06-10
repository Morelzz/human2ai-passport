// ────────────────────────────────────────────────────────────────────────────
// FAQ — fonte unica di domande e risposte (review C6 / brief F3).
// Alimenta sia la pagina /faq sia lo schema FAQPage (JSON-LD) per i motori.
//
// ⚠️ TESTI IN BOZZA: scritti come segnaposto funzionali. I testi definitivi
// li scrive Morelz (con Claude chat) e si incollano QUI, verbatim — la pagina
// e lo schema si aggiornano da soli. Una domanda = un oggetto { q, a }.
// ────────────────────────────────────────────────────────────────────────────

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Cos'è Human2AI, in una frase?",
    a: "È il registro dei diritti d'immagine: il filtro che impedisce all'AI di generare un essere umano senza il consenso — verificato e pagato — della persona reale.",
  },
  {
    q: "Il mio volto è al sicuro? Chi vede i miei dati?",
    a: "I tuoi documenti e i dati di verifica restano su server protetti e non vengono mai venduti né mostrati a nessuno. In pubblico esistono solo il tuo alias, il tuo ritratto e il token di verifica: mai dati personali, mai dati biometrici.",
  },
  {
    q: "E se cambio idea?",
    a: "Revochi quando vuoi, dal tuo account, con effetto immediato. La revoca blocca ogni generazione futura: quello che era stato autorizzato prima resta lecito, quello che viene dopo è impossibile. La timeline sul tuo passaporto lo mostra a chiunque.",
  },
  {
    q: "Mettere il mio volto costa qualcosa?",
    a: "No, mai. La verifica dell'identità e la creazione dell'avatar sono a carico nostro. Chi mette il volto non paga: guadagna.",
  },
  {
    q: "Quanto guadagno quando il mio volto viene usato?",
    a: "L'80% di ogni generazione commerciale. Le royalty si accumulano nel tuo wallet e le incassi al raggiungimento della soglia. Ogni utilizzo è tracciato e lo vedi nel tuo storico.",
  },
  {
    q: "Chi può usare il mio volto, e per cosa?",
    a: "Solo chi passa dal filtro, e solo nelle categorie che TU hai approvato. Se una richiesta cade in una categoria che non concedi, viene bloccata — e il blocco viene contato pubblicamente nel nostro Transparency Report.",
  },
  {
    q: "Come faccio a sapere se un contenuto è stato fatto col consenso?",
    a: "Ogni contenuto autorizzato esce con un certificato verificabile e una filigrana invisibile. Carichi l'immagine (o incolli il token) su /verify e ottieni la risposta: chi c'è dietro, cosa ha consentito, quando.",
  },
  {
    q: "Cosa succede se qualcuno usa il mio volto senza permesso?",
    a: "Lo segnali — tu o chiunque altro — dal passaporto o da /report. Ogni segnalazione apre un flusso di verifica tracciato che può portare alla rimozione e alla sospensione. Un contenuto senza certificato non è un contenuto Human2AI.",
  },
  {
    q: "Le immagini generate sono riconoscibili come AI?",
    a: "Sì, per scelta e per legge: certificato, filigrana invisibile e metadati di provenienza accompagnano ogni output. La trasparenza sui contenuti sintetici non è un optional: è la direzione dell'AI Act europeo, e noi ci arriviamo prima.",
  },
  {
    q: "Devo essere un modello per entrare nel registro?",
    a: "No. Il registro è per chiunque voglia possedere la propria immagine nell'era dell'AI: ogni volto vero ha valore, e la domanda dei compratori è più varia di qualsiasi agenzia.",
  },
];
