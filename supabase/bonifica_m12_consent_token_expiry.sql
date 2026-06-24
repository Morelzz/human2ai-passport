-- BONIFICA M12 (BOZZA, NON ancora applicata, attende "applica" di Morelz)
-- Scadenza del token di consenso.
--
-- COSA FA: aggiunge avatars.consent_token_expires_at. Un consent_token (il link
-- che la persona apre per confermare il consenso) valido a tempo indefinito e un
-- vettore: chi intercetta il link puo confermare al posto della persona. Il
-- codice valorizzera la scadenza alla creazione del token e la verifichera in
-- /api/consent/[token] dopo l'apply.
--
-- IMPATTO: additivo. NESSUNO sulle righe esistenti: i pochi token gia emessi non
-- avranno scadenza e il codice li trattera come da ri-emettere. Reversibile.
--
-- FOUNDER: nessun impatto (token di consenso e flusso Enterprise).

alter table avatars add column if not exists consent_token_expires_at timestamptz;
