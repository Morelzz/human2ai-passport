-- Fase 2.1 (modulo VETO): stato "protection_only" sugli avatar.
-- Un avatar protection_only e' una registrazione INVERSA (concetto legale:
-- "Diritto all'Oblio Generativo"): la persona NON vuole essere generata.
-- Additivo e inerte: le righe esistenti restano false.
--
-- Semantica (applicata dal codice):
--  * escluso da OGNI superficie pubblica (catalogo, match, home, trasparenza)
--    tramite isPublicAvatar in lib/registry.ts;
--  * nessun repertorio, nessuna posa;
--  * tutte le categorie di consenso forzate a BLOCK e non modificabili verso
--    ALLOW (gate in /api/avatar/consent);
--  * gate assoluto in input su /api/generate (reason protected_face, Fase 2.2);
--  * esiste solo per il faceprint difensivo nella face-index (Fase 2.4).

alter table avatars
  add column if not exists protection_only boolean not null default false;

-- Indice parziale: i protetti sono poche righe, ma vogliamo trovarli/escluderli
-- senza scansione piena al crescere del registro.
create index if not exists avatars_protection_only_idx
  on avatars (protection_only) where protection_only = true;
