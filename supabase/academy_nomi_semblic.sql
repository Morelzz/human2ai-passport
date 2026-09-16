-- Academy: i corsi seminati col vecchio nome (HUMAN2AI, H2AI-SCAN) prendono il
-- nome Semblic, come in lib/academy.ts. Solo testi: slug e id restano uguali,
-- quindi nessun riferimento si rompe. Idempotente.
update corsi
set titolo = 'Benvenuti in SEMBLIC',
    descrizione = 'Cos''è il registro, come funziona il consenso, i tier, i tuoi diritti d''immagine spiegati semplici.'
where slug = 'benvenuti-in-human2ai';

update corsi
set titolo = 'Il protocollo SEMBLIC-SCAN'
where slug = 'protocollo-h2ai-scan';
