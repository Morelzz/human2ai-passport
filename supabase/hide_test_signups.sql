-- Review blocco A (A2) — Dati di test fuori dal registro pubblico.
-- I tre signup di prova (OKKIO, oiiii, Riccardo tirincanti) erano `approved`:
-- li portiamo a `rejected` = rimozione dal registro pubblico, stessa semantica
-- della sospensione admin (/api/admin/reports). Nessuna modifica di schema.
-- NB: i 15 volti demo del seed (is_demo=true, incluso Mario) restano: SONO il
-- registro di presentazione finché non arrivano gli avatar reali.
--
-- [GIÀ APPLICATA via REST il 2026-06-10 durante il blocco A — file tenuto come
-- registro storico delle modifiche dati.]
update avatars set verification_status = 'rejected' where handle in ('maros', 'rickhost', '9990o');
