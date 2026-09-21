# SEMBLIC FOR BUSINESS: Documento strategico

> Linea di strumenti AI per piccole imprese, sotto-brand di Semblic.
> Erogazione web-first dentro semblic.com. Questo e un documento di indirizzo, non codice.
> Stato: proposta da validare. Data: 2026-06-18.
> Spec operativa dei primi tool: vedi `docs/SEMBLIC_BUSINESS_TOOLS_SPEC.md`.

---

## 0. TL;DR (le 5 decisioni)

1. **Cosa:** una suite di tool AI per PMI, utili da subito, sotto il marchio "Semblic for Business".
2. **Come:** web-first (moduli SaaS nello stack attuale Next.js + Supabase). Il desktop solo come agente sottile, dove serve davvero.
3. **Dove:** una sezione dedicata di semblic.com (es. `/business`), stessa identita visiva del core.
4. **Perche:** nuovo motore di ricavi ricorrenti e, soprattutto, imbuto naturale verso il core (avatar consenzienti).
5. **Disciplina:** si costruisce per davvero un solo tool flagship per volta. Gli altri restano roadmap pubblica.

---

## 1. Il principio guida (non perdere il focus)

Promemoria dal `CLAUDE.md`: il cuore del progetto e l'Avatar Passport, "una cosa fatta bene".
Business e una linea **parallela**, non un dirottamento. Regola operativa: in ogni fase, al massimo
1 o 2 tool in costruzione reale, il resto e vetrina e roadmap. Se un tool business rallenta il core,
si ferma. Il core ha sempre priorita.

---

## 2. Perche questa linea ha senso per Semblic (non solo per fare cassa)

- **Funnel verso il core.** Una PMI entra per un tool concreto (contenuti, contratti, compliance),
  prende confidenza con l'AI, e quando le serve un volto per il marketing trova gli avatar
  consenzienti del registro. Cross-sell naturale, senza forzature.
- **Coerenza di marca.** I valori del core (consenso, privacy by default, trasparenza) diventano un
  differenziatore anche nei tool business, contro i tanti wrapper generici di ChatGPT.
- **Fiducia come vantaggio.** Le PMI italiane si fidano di un marchio che mette la tutela al centro.
  E un vantaggio competitivo, non un costo.
- **Ricavi ricorrenti** che aiutano a finanziare lo sviluppo del core.

---

## 3. La strada tecnica: web-first (decisa)

| | Web (SaaS, default) | Desktop (agente sottile, eccezione) |
|---|---|---|
| Quando | regola generale | molte cartelle locali da leggere, lavoro offline, file pesanti (audio, video, scansioni), dati che non devono uscire dal PC |
| Pro | zero installazione, update istantanei, abbonamento, dati lato server (privacy) | accesso al filesystem, potenza locale, funziona offline |
| Contro | richiede connessione, limiti sui file molto grandi | due piattaforme da mantenere (Windows e Mac), distribuzione e aggiornamenti |
| Tecnologia | riuso di Next.js + Supabase + token brand | Tauri (leggero) come "connettore", non un secondo prodotto |

Decisioni:

- **Default: tutto web**, dentro semblic.com.
- **PWA** per dare la sensazione di app installabile senza scrivere un secondo software.
- **Desktop solo dove si giustifica** (nei 10 tool: amministrazione e fatture, cervello aziendale,
  email e riunioni, compliance su file sensibili). Anche li, l'agente locale fa solo lettura e
  pre-elaborazione, mentre l'interfaccia resta web.

---

## 4. Posizionamento: sotto-brand "Semblic for Business"

- **Ombrello:** stesso marchio Semblic, stessa palette (Obsidian, Lumen, Amber), stesso tono premium,
  con un accento in piu sulla produttivita.
- **Collocazione:** sezione `/business` (in futuro eventualmente `business.semblic.com`).
- **Promessa:** "L'AI che lavora per la tua impresa, con i tuoi dati al sicuro."
- **Relazione col core:** due prodotti, un solo account Semblic e un solo wallet. Chi e gia nel
  registro volti ha un onboarding agevolato sui tool, e viceversa.

---

## 5. I 10 tool (mappa completa con priorita)

Legenda tipo: W = web, D = desktop, H = ibrido. Priorita: P1 (ora), P2 (prossimo), P3 (roadmap).

| # | Tool | Cosa fa (in breve) | Tipo | Sinergia col core | Priorita |
|---|---|---|---|---|---|
| 1 | Amministrazione e fatture | OCR e AI su fatture e ricevute, categorizza, ricorda scadenze IVA e F24, segnala anomalie | H | bassa | P2 |
| 2 | Studio Contenuti (brand voice) | impara il tono dell'azienda e genera post, calendario editoriale, varianti | W | alta (video con avatar) | **P1 flagship** |
| 3 | Assistente clienti integrabile | chatbot addestrato su sito, FAQ, WhatsApp ed email | W | media | P2 |
| 4 | Radar recensioni e reputazione | aggrega recensioni, analizza il sentiment, suggerisce risposte e trend | W | bassa | P3 |
| 5 | Preventivi, proposte e contratti | da un brief a preventivo o contratto con firma elettronica | W | alta (consenso e diritti) | **P1** |
| 6 | CRM leggero con AI | lead scoring, follow-up, bozze email, riassunto pipeline | W | bassa | P3 |
| 7 | Cervello aziendale (knowledge base) | domande in linguaggio naturale sui documenti interni | H | media | P2 |
| 8 | Assistente email e riunioni | bozze, riassunti dei thread, trascrizione con elenco azioni | H | bassa | P3 |
| 9 | Sito e landing con SEO locale | da una descrizione a sito e testi ottimizzati | W | media | P3 |
| 10 | Analisi documenti e compliance GDPR | rischi nei contratti, privacy policy, cookie banner a norma | H | alta (privacy e legale) | **P1** |

I tre P1 (numeri 2, 5 e 10) sono i piu vicini al DNA di Semblic e partono per primi.
La loro specifica operativa e in `docs/SEMBLIC_BUSINESS_TOOLS_SPEC.md`.

---

## 6. Modello di prezzo (proposta da validare)

Approccio freemium piu abbonamento mensile (euro, IVA esclusa).
Nota: le cifre vanno confermate con un'analisi dei concorrenti italiani prima del lancio.

- **Free:** assaggio limitato (es. un tetto di generazioni al mese), con firma Semblic. Serve a far entrare.
- **Starter:** prezzo basso per singolo professionista o micro impresa, un tool.
- **Business:** bundle di piu tool, piu volume, piu utenti.
- **Add-on a consumo:** crediti extra che coprono il costo dei token AI.
- **Bundle col core:** sconto per chi usa anche il registro volti e gli avatar.

Principio: gia dal piano Starter il prezzo deve coprire con margine il costo variabile
(token AI, storage).

---

## 7. Roadmap (fasi, senza date rigide)

- **Fase 0, validazione:** landing `/business` con waitlist e tre schede tool. Si misura l'interesse
  prima di costruire. Costo quasi zero, riusa il sito esistente.
- **Fase 1, MVP flagship:** si costruisce solo lo Studio Contenuti (numero 2), completo. Obiettivo:
  10 PMI che lo usano davvero.
- **Fase 2, espansione mirata:** si aggiungono Contratti (numero 5) e Compliance (numero 10), i due
  piu vicini al DNA del progetto.
- **Fase 3, ampiezza:** gli altri tool secondo la domanda reale, e si valuta l'agente desktop dove serve.

Tra una fase e l'altra c'e un cancello: si avanza solo se la fase precedente ha numeri veri
(uso, retention), altrimenti si itera.

---

## 8. Rischi e guardrail

- **Focus:** il rischio numero uno. Mitigazione: un flagship per volta, cancelli tra le fasi, il core
  resta prioritario.
- **GDPR e dati cliente:** i tool trattano dati aziendali. Servono contratto di trattamento dati (DPA),
  dati lato server, nessun addestramento sui dati del cliente senza consenso esplicito, possibilita di
  cancellazione. Coerente con i guardrail del progetto.
- **Qualita dell'output AI:** rischio di errori su contratti e compliance. Mitigazione: human in the
  loop (l'AI propone, l'umano approva), disclaimer chiari (non sostituisce un legale o un commercialista).
- **Costi dei token:** vanno marginati dai piani a consumo, monitorando il costo per utente attivo.
- **Commoditizzazione:** esistono molti wrapper generici. La differenza la fanno marca, fiducia,
  integrazione col core e localizzazione italiana.

---

## 9. Metriche di successo

- **Fase 0:** iscritti in waitlist, costo per iscritto.
- **Fase 1:** PMI attive, retention a 30 giorni, contenuti generati per utente, soddisfazione (NPS).
- **Business:** conversione da free a paid, ricavo ricorrente mensile, costo AI per utente.
- **Strategiche:** quante PMI business passano poi al core (cross-sell) e viceversa.

---

## 10. Prossimi passi concreti

1. Validare prezzi e concorrenti con una ricerca di mercato mirata.
2. Pubblicare la landing `/business` con waitlist, riusando i componenti esistenti.
3. Approvare la spec del flagship (numero 2) e costruire l'MVP.
4. Decidere il nome definitivo del tool numero 2, per evitare il conflitto con `/studio` del core
   (che e lo studio avatar). Proposta nella spec.
