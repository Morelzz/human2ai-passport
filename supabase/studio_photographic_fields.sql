-- Studio: parametri fotografici scelti in generazione (additivi, nessun dato
-- biometrico). best-effort lato codice: l'app gira anche se non applicata.
alter table public.generations
  add column if not exists camera       text,
  add column if not exists lens         text,
  add column if not exists light        text,
  add column if not exists color_style  text,
  add column if not exists framing      text,
  add column if not exists expression   text;
