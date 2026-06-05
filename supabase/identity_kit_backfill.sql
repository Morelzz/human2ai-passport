-- Migrazione identity kit: nuove colonne metadati + backfill dei 15 avatar demo.
-- Eseguire una sola volta. Idempotente (add column if not exists + update per id).

-- 1. Nuove colonne (sicure se già esistenti)
alter table avatars add column if not exists eye_color   text;
alter table avatars add column if not exists height      text;
alter table avatars add column if not exists facial_hair text;
alter table avatars add column if not exists glasses     text;
alter table avatars add column if not exists tattoos     text;
alter table avatars add column if not exists language    text;

-- 2. Backfill metadati demo (valori plausibili, coerenti con IDENTITY_KIT)

-- 1. Mario R.
update avatars set eye_color='marroni', height='media', facial_hair='barba incolta', glasses='no',              tattoos='nessuno',  language='italiano'
 where id='a1000000-0000-0000-0000-000000000001';

-- 2. Giulia V.
update avatars set eye_color='azzurri', height='alta',  facial_hair='nessuna',       glasses='no',              tattoos='nessuno',  language='italiano'
 where id='a2000000-0000-0000-0000-000000000002';

-- 3. Kenji T.
update avatars set eye_color='neri',    height='media', facial_hair='nessuna',       glasses='occhiali da vista', tattoos='nessuno', language='inglese'
 where id='a3000000-0000-0000-0000-000000000003';

-- 4. Amara N.
update avatars set eye_color='marroni', height='alta',  facial_hair='nessuna',       glasses='no',              tattoos='visibili', language='inglese'
 where id='a4000000-0000-0000-0000-000000000004';

-- 5. Luca B.
update avatars set eye_color='nocciola',height='media', facial_hair='barba',         glasses='occhiali da vista', tattoos='nessuno', language='italiano'
 where id='a5000000-0000-0000-0000-000000000005';

-- 6. Sofia M.
update avatars set eye_color='verdi',   height='bassa', facial_hair='nessuna',       glasses='occhiali da vista', tattoos='nessuno', language='spagnolo'
 where id='a6000000-0000-0000-0000-000000000006';

-- 7. Chen W.
update avatars set eye_color='neri',    height='alta',  facial_hair='nessuna',       glasses='no',              tattoos='nessuno',  language='inglese'
 where id='a7000000-0000-0000-0000-000000000007';

-- 8. Elena K.
update avatars set eye_color='grigi',   height='alta',  facial_hair='nessuna',       glasses='no',              tattoos='visibili', language='inglese'
 where id='a8000000-0000-0000-0000-000000000008';

-- 9. Marcus J.
update avatars set eye_color='marroni', height='alta',  facial_hair='barba',         glasses='occhiali da sole', tattoos='visibili', language='inglese'
 where id='a9000000-0000-0000-0000-000000000009';

-- 10. Yuki S.
update avatars set eye_color='neri',    height='media', facial_hair='nessuna',       glasses='no',              tattoos='nessuno',  language='inglese'
 where id='aa000000-0000-0000-0000-000000000010';

-- 11. Pedro A.
update avatars set eye_color='marroni', height='media', facial_hair='barba',         glasses='no',              tattoos='visibili', language='spagnolo'
 where id='ab000000-0000-0000-0000-000000000011';

-- 12. Fatima Z.
update avatars set eye_color='marroni', height='media', facial_hair='nessuna',       glasses='no',              tattoos='nessuno',  language='francese'
 where id='ac000000-0000-0000-0000-000000000012';

-- 13. Lars O.
update avatars set eye_color='azzurri', height='alta',  facial_hair='barba incolta', glasses='no',              tattoos='nessuno',  language='inglese'
 where id='ad000000-0000-0000-0000-000000000013';

-- 14. Priya M.
update avatars set eye_color='marroni', height='media', facial_hair='nessuna',       glasses='occhiali da vista', tattoos='nessuno', language='inglese'
 where id='ae000000-0000-0000-0000-000000000014';

-- 15. Tom H.
update avatars set eye_color='azzurri', height='media', facial_hair='baffi',         glasses='occhiali da vista', tattoos='nessuno', language='inglese'
 where id='af000000-0000-0000-0000-000000000015';
