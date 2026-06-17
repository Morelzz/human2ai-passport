// F2 / B3 — oggetti del form /contatti, fonte UNICA condivisa client + server.
// Il menu select (ContactForm) e la whitelist di validazione (/api/contact)
// devono restare allineati. Quando erano due liste separate, la voce
// "Ingaggio reale" (B3) era nel menu ma non nella whitelist del server:
// ogni richiesta di ingaggio veniva quindi rifiutata con 400 all'invio.
// Tenere una sola lista qui rende impossibile quella deriva.
export const CONTACT_SUBJECTS: readonly string[] = [
  "Sono un brand",
  "Voglio mettere il mio volto",
  "Ingaggio reale",
  "Stampa",
  "Partner",
  "Legale",
  "Altro",
];
