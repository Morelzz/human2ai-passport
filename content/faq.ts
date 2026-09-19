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
    q: "Cos'è Semblic, in una frase?",
    a: "È il registro dei diritti d'immagine: il filtro che impedisce all'AI di generare un essere umano senza il consenso, verificato e pagato, della persona reale.",
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
    a: "Una quota di ogni generazione commerciale: il prezzo copre il costo del motore più un ricarico, e il 45% di quel ricarico è tuo. Le royalty si accumulano nel tuo wallet e le incassi al raggiungimento della soglia. Ogni utilizzo è tracciato e lo vedi nel tuo storico.",
  },
  {
    q: "Chi può usare il mio volto, e per cosa?",
    a: "Solo chi passa dal filtro, e solo se TU hai dato il consenso all'uso commerciale. È un sì o no che controlli tu e puoi revocare quando vuoi: senza il tuo consenso la generazione viene bloccata, e ogni blocco viene contato pubblicamente nel nostro Transparency Report.",
  },
  {
    q: "Come faccio a sapere se un contenuto è stato fatto col consenso?",
    a: "Ogni contenuto autorizzato esce con un certificato verificabile e una filigrana invisibile. Carichi l'immagine (o incolli il token) su /verify e ottieni la risposta: chi c'è dietro, cosa ha consentito, quando. I video portano il certificato dentro il file: Sigil lo legge sul tuo dispositivo, senza caricare il video da nessuna parte.",
  },
  {
    q: "Se scrivo solo la scena, chi sceglie il volto?",
    a: "Semblic. Scrivi cosa succede, per esempio una ragazza bionda che corre in un campo, e il casting sceglie dal registro una persona vera che corrisponde e ha dato il consenso, dando la precedenza a chi è stato scelto meno. Se nessuno corrisponde del tutto te lo dice prima di generare. Puoi anche chiamare le persone per nome, con la maiuscola: Gabriella e Stella al bar.",
  },
  {
    q: "Posso fare una foto con più persone del registro?",
    a: "Sì, fino a quattro in primo piano. Prima si compone la scena, poi ogni volto viene rifatto con le foto verificate della sua persona, uno alla volta, e ognuno viene misurato. Il prezzo è quello di tanti scatti quanti sono i passaggi, e la parte delle persone si divide in parti uguali. Il resto della gente resta sullo sfondo, non riconoscibile.",
  },
  {
    q: "Posso trasformare uno scatto in un video?",
    a: "Sì, con Anima: dallo scatto certificato nasce un video di 5 o 10 secondi. Serve un secondo sì, quello al video, che la persona dà o toglie dal suo account. Il video non ha mai audio, perché la voce di una persona non si genera. Prima di arrivarti viene controllato fotogramma per fotogramma: se compare un volto protetto viene annullato e i crediti tornano indietro.",
  },
  {
    q: "Quanto somiglia il risultato alla persona vera?",
    a: "Lo misuriamo invece di prometterlo. Ogni scatto viene confrontato con le foto verificate della persona e la percentuale compare sul risultato e sulla ricevuta; nei video la misura si fa su ogni fotogramma controllato. Le impronte del volto usate per il confronto restano solo nella memoria del server, al massimo un'ora, e non vengono mai salvate: si salva soltanto la percentuale.",
  },
  {
    q: "Cosa succede se qualcuno usa il mio volto senza permesso?",
    a: "Lo segnali, tu o chiunque altro, dal passaporto o da /report. Ogni segnalazione apre un flusso di verifica tracciato che può portare alla rimozione e alla sospensione. Un contenuto senza certificato non è un contenuto Semblic.",
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
