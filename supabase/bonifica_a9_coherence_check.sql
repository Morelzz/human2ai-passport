-- BONIFICA A9 (BOZZA, NON ancora applicata, OPZIONALE, attende "applica")
-- Coerenza di stato garantita a livello DB.
--
-- COSA FA: garantisce a DB che un volto in SOLA PROTEZIONE non possa essere
-- commerciale. Oggi lo garantisce gia il codice (il VETO imposta
-- commercial_consent = false e la consent API blocca i protection_only); questo
-- CHECK e una cintura di sicurezza in piu, indipendente dai rami applicativi.
--
-- IMPATTO: nessuno SE tutte le righe gia rispettano la regola.
-- VERIFICARE PRIMA DI APPLICARE (atteso: 0):
--   select count(*) from avatars where protection_only and commercial_consent;
-- Se 0, la migrazione passa. Altrimenti correggere quelle righe prima.
--
-- FOUNDER: i founder sono avatar pubblici/commerciali (protection_only = false),
-- quindi il CHECK non li tocca.

alter table avatars add constraint avatars_protection_not_commercial
  check (not protection_only or commercial_consent = false);
