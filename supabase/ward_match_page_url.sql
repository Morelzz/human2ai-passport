-- Ward: pagina che ospita l'immagine trovata (per il link cliccabile).
-- scan_matches.source_url resta l'URL diretto dell'immagine; page_url e' la pagina
-- web dove l'immagine appare (da Vision pagesWithMatchingImages). Nullable: i
-- candidati "visivamente simili" spesso non hanno una pagina associata.
alter table public.scan_matches
  add column if not exists page_url text;

comment on column public.scan_matches.page_url is
  'Pagina web che ospita l''immagine (Vision pagesWithMatchingImages). Null se non nota (es. visuallySimilarImages).';
