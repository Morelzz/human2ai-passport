-- ──────────────────────────────────────────────────────────────────────────
-- PROFILO PUBBLICO DELL'AVATAR (giugno 2026, richiesta Morelz)
-- Additiva e nullable: zero impatto sulle righe esistenti.
--
--  real_name    nome e cognome PUBBLICO sul passport (opzionale: lo decide
--               la persona; per gli ambassador es. 'Manuel Caso')
--  instagram    handle o URL Instagram (opzionale)
--  facebook     handle o URL Facebook (opzionale)
--  gallery_urls repertorio: URL puliti delle immagini campione (generate
--               con ECHO), servite SEMPRE watermarkate via /api/sample.
--               Sostituisce la mappa hardcoded lib/sample-galleries.ts
--               (che resta come fallback finché la colonna è vuota).
-- ──────────────────────────────────────────────────────────────────────────

alter table avatars add column if not exists real_name text;
alter table avatars add column if not exists instagram text;
alter table avatars add column if not exists facebook text;
alter table avatars add column if not exists gallery_urls text[];

comment on column avatars.real_name is 'Nome e cognome pubblico sul passport (opzionale, scelta della persona)';
comment on column avatars.instagram is 'Handle o URL Instagram (opzionale, pubblico)';
comment on column avatars.facebook is 'Handle o URL Facebook (opzionale, pubblico)';
comment on column avatars.gallery_urls is 'Repertorio: URL puliti delle immagini campione, servite watermarkate via /api/sample';
