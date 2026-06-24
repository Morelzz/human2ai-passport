-- BONIFICA CRIT-2 (BOZZA, NON ancora applicata, attende "applica" di Morelz)
-- Default fail-closed del consenso commerciale.
--
-- COSA FA: inverte il default di avatars.commercial_consent da true a false. Un
-- avatar nuovo NON e commerciale finche qualcuno non lo afferma esplicitamente
-- (Art. 9 GDPR, "privacy by default").
--
-- IMPATTO SULLE RIGHE ESISTENTI: NESSUNO. Il default vale solo per i NUOVI
-- insert; le 12 righe founder mantengono il valore gia memorizzato (true). La
-- create (app/api/avatar/create) scrive comunque un valore esplicito, quindi
-- nessun flusso dipende dal default. Reversibile (set default true).
--
-- FOUNDER: intoccati.

alter table avatars alter column commercial_consent set default false;
