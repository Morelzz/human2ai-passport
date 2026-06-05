-- FASE 2 — Modulo 7: modalità generazione (anteprima vs commerciale)
-- 'preview'    = anteprima watermarkata, non commerciale, NESSUNA royalty.
-- 'commercial' = output pulito, pagato, royalty accreditata, certificato.
-- Idempotente.

alter table generations add column if not exists mode text not null default 'commercial';

create index if not exists generations_mode_idx on generations(buyer_id, mode);
