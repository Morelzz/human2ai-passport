-- FASE 2 — Bridge di generazione (Higgsfield Soul)
-- Colonne aggiuntive: riferimento al modello Soul sull'avatar e output sul record di generazione.
-- Idempotente.

-- Riferimento al modello Soul addestrato sul motore (null per gli avatar demo).
alter table avatars add column if not exists soul_ref text;

-- Output della generazione: immagine prodotta e id sul motore.
alter table generations add column if not exists image_url  text;
alter table generations add column if not exists engine_ref text;
