-- Fase 2.2 (modulo VETO): nuovo motivo di blocco 'protected_face'.
-- Registrato quando /api/generate rifiuta un volto in sola protezione
-- (protection_only). Additivo: estende il CHECK esistente, nessun dato cambia.
-- NB: logBlockedRequest e' fire-and-forget, quindi il blocco funziona anche prima
-- di questa migrazione (l'insert del log fallirebbe in silenzio sul vecchio CHECK).

alter table blocked_requests drop constraint if exists blocked_requests_reason_check;
alter table blocked_requests add constraint blocked_requests_reason_check
  check (reason in ('no_match','category_excluded','category_not_approved','revoked','protected_face'));
