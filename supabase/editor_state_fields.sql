-- Editor di post-produzione (Semblic Editor): stato NON distruttivo + scelte di
-- export, additivo (nessun dato biometrico). edit_state serializza l'EditState
-- (preset, intensita, luce, colore, hsl, dettaglio, curve); upscale/export_format
-- registrano l'ultima esportazione. Applicata in prod (migration editor_state_fields).
alter table public.generations
  add column if not exists edit_state    jsonb,
  add column if not exists upscale       text,
  add column if not exists export_format text;
