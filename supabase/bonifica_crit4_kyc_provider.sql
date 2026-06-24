-- BONIFICA CRIT-4 (BOZZA, NON ancora applicata, attende "applica" di Morelz)
-- Tracciabilita del KYC: distinguere un "approved" reale da uno stub.
--
-- COSA FA: aggiunge profiles.kyc_provider ('stub' | 'didit' | 'manual'). Permette
-- al bonus VOLT di essere erogato SOLO per i KYC reali, e di sapere a valle come
-- e stato verificato un utente. Il codice usera questa colonna dopo l'apply.
--
-- IMPATTO: additivo. Backfill prudente dei profili gia 'approved' a 'manual'
-- (sono frutto della verifica manuale operatori, inclusi i founder verificati in
-- studio). Gli altri restano null. Nessuna riga persa.
--
-- NB: contiene un UPDATE su righe esistenti -> all'apply puo servire "applica"
-- esplicito (classifier).

alter table profiles add column if not exists kyc_provider text
  check (kyc_provider is null or kyc_provider in ('stub', 'didit', 'manual'));

update profiles set kyc_provider = 'manual'
  where kyc_status = 'approved' and kyc_provider is null;
