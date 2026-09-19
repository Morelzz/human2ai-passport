-- SOMIGLIANZA MISURATA (19/9/2026): ogni scatto si misura contro le foto vere
-- e verificate della persona (lib/identity-score). Additiva e nullable: finche'
-- non e' applicata il worker scrive in un update a parte che fallisce in
-- silenzio, le generazioni continuano. Si applica solo a "applica".

alter table generations add column if not exists identity_score integer;
alter table generations add column if not exists identity_distance numeric(5,3);
alter table generations add column if not exists identity_extra_faces integer;

comment on column generations.identity_score is
  'Somiglianza in % (curva di lib/face-similarity) fra il volto nello scatto e le foto verificate della persona. NULL = non misurata.';
comment on column generations.identity_distance is
  'Distanza FaceNet media delle 3 foto di riferimento piu'' vicine (piu'' bassa = piu'' simile).';
comment on column generations.identity_extra_faces is
  'Volti riconoscibili (>= 80 px) nello scatto che non sono di nessun protagonista: la regola protagonisti e folla.';
