-- Seed AGGIUNTIVO: 9 avatar demo (7-15) per arrivare a 15 totali.
-- Da eseguire DOPO seed.sql (che ha già inserito i primi 6).
-- token_hash calcolato con SHA256(id|consent_start|JSON(approved_categories)).

insert into avatars (id, handle, alias, portrait_url, tier, gender, age_range, ethnicity, hair_color, body_type, approved_categories, excluded_categories, consent_start, consent_end, revoked_at, token_hash, usage_count, royalty_accrued_cents, is_demo) values

-- 7. Chen W. — SOUL — Attivo
('a7000000-0000-0000-0000-000000000007',
 'chen-w', 'Chen W.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=chen-w&backgroundColor=6B21E8',
 'SOUL', 'uomo', '30-40', 'cinese', 'neri', 'atletico',
 ARRAY['Business','Luxury','Travel'],
 ARRAY['Politics'],
 '2026-02-15', null, null,
 encode(sha256(('a7000000-0000-0000-0000-000000000007' || '|' || '2026-02-15' || '|' || '["Business","Luxury","Travel"]')::bytea), 'hex'),
 120, 1600, true),

-- 8. Elena K. — HUMAN — Attivo
('a8000000-0000-0000-0000-000000000008',
 'elena-k', 'Elena K.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=elena-k&backgroundColor=B8005C',
 'HUMAN', 'donna', '35-45', 'russa', 'rossi', 'slim',
 ARRAY['Fashion','Beauty','Luxury'],
 ARRAY['Alcohol','Politics'],
 '2026-01-25', null, null,
 encode(sha256(('a8000000-0000-0000-0000-000000000008' || '|' || '2026-01-25' || '|' || '["Fashion","Beauty","Luxury"]')::bytea), 'hex'),
 210, 3400, true),

-- 9. Marcus J. — SHAPE — Attivo
('a9000000-0000-0000-0000-000000000009',
 'marcus-j', 'Marcus J.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=marcus-j&backgroundColor=00A896',
 'SHAPE', 'uomo', '25-35', 'afroamericano', 'rasati', 'atletico',
 ARRAY['Sport','Entertainment','Fashion'],
 ARRAY['Politics'],
 '2026-03-10', null, null,
 encode(sha256(('a9000000-0000-0000-0000-000000000009' || '|' || '2026-03-10' || '|' || '["Sport","Entertainment","Fashion"]')::bytea), 'hex'),
 95, 780, true),

-- 10. Yuki S. — SOUL — Attivo
('aa000000-0000-0000-0000-000000000010',
 'yuki-s', 'Yuki S.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=yuki-s&backgroundColor=6B21E8',
 'SOUL', 'donna', '20-30', 'giapponese', 'neri', 'slim',
 ARRAY['Beauty','Fashion','Entertainment','Travel'],
 ARRAY['Alcohol'],
 '2026-02-20', null, null,
 encode(sha256(('aa000000-0000-0000-0000-000000000010' || '|' || '2026-02-20' || '|' || '["Beauty","Fashion","Entertainment","Travel"]')::bytea), 'hex'),
 175, 2200, true),

-- 11. Pedro A. — SPARK — Attivo
('ab000000-0000-0000-0000-000000000011',
 'pedro-a', 'Pedro A.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=pedro-a&backgroundColor=374151',
 'SPARK', 'uomo', '40-50', 'brasiliano', 'castani', 'robusto',
 ARRAY['Food','Sport','Travel'],
 ARRAY['Politics','Alcohol'],
 '2025-12-20', null, null,
 encode(sha256(('ab000000-0000-0000-0000-000000000011' || '|' || '2025-12-20' || '|' || '["Food","Sport","Travel"]')::bytea), 'hex'),
 34, 150, true),

-- 12. Fatima Z. — HUMAN — Attivo
('ac000000-0000-0000-0000-000000000012',
 'fatima-z', 'Fatima Z.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=fatima-z&backgroundColor=B8005C',
 'HUMAN', 'donna', '30-40', 'marocchina', 'neri', 'normale',
 ARRAY['Beauty','Lifestyle','Business','Healthcare'],
 ARRAY['Alcohol'],
 '2026-01-05', null, null,
 encode(sha256(('ac000000-0000-0000-0000-000000000012' || '|' || '2026-01-05' || '|' || '["Beauty","Lifestyle","Business","Healthcare"]')::bytea), 'hex'),
 260, 4100, true),

-- 13. Lars O. — SHAPE — Attivo
('ad000000-0000-0000-0000-000000000013',
 'lars-o', 'Lars O.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=lars-o&backgroundColor=00A896',
 'SHAPE', 'uomo', '30-40', 'svedese', 'biondi', 'slim',
 ARRAY['Business','Travel','Sport'],
 ARRAY['Politics'],
 '2026-03-01', null, null,
 encode(sha256(('ad000000-0000-0000-0000-000000000013' || '|' || '2026-03-01' || '|' || '["Business","Travel","Sport"]')::bytea), 'hex'),
 58, 420, true),

-- 14. Priya M. — SOUL — Attivo
('ae000000-0000-0000-0000-000000000014',
 'priya-m', 'Priya M.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=priya-m&backgroundColor=6B21E8',
 'SOUL', 'donna', '25-35', 'indiana', 'neri', 'curvy',
 ARRAY['Fashion','Beauty','Healthcare','Lifestyle'],
 ARRAY['Alcohol','Politics'],
 '2026-02-10', null, null,
 encode(sha256(('ae000000-0000-0000-0000-000000000014' || '|' || '2026-02-10' || '|' || '["Fashion","Beauty","Healthcare","Lifestyle"]')::bytea), 'hex'),
 188, 2600, true),

-- 15. Tom H. — SPARK — REVOCATO dal 2026-04-15
('af000000-0000-0000-0000-000000000015',
 'tom-h', 'Tom H.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=tom-h&backgroundColor=374151',
 'SPARK', 'uomo', '50-60', 'inglese', 'grigi', 'normale',
 ARRAY['Business','Food'],
 ARRAY['Sport','Entertainment'],
 '2025-11-20', null, '2026-04-15',
 encode(sha256(('af000000-0000-0000-0000-000000000015' || '|' || '2025-11-20' || '|' || '["Business","Food"]')::bytea), 'hex'),
 45, 320, true);

-- Eventi di consenso per i nuovi avatar
insert into consent_events (avatar_id, event_type, detail, occurred_at) values
('a7000000-0000-0000-0000-000000000007', 'GRANTED', 'Consenso iniziale', '2026-02-15'),
('a8000000-0000-0000-0000-000000000008', 'GRANTED', 'Consenso iniziale', '2026-01-25'),
('a9000000-0000-0000-0000-000000000009', 'GRANTED', 'Consenso iniziale', '2026-03-10'),
('aa000000-0000-0000-0000-000000000010', 'GRANTED', 'Consenso iniziale', '2026-02-20'),
('ab000000-0000-0000-0000-000000000011', 'GRANTED', 'Consenso iniziale', '2025-12-20'),
('ac000000-0000-0000-0000-000000000012', 'GRANTED', 'Consenso iniziale', '2026-01-05'),
('ad000000-0000-0000-0000-000000000013', 'GRANTED', 'Consenso iniziale', '2026-03-01'),
('ae000000-0000-0000-0000-000000000014', 'GRANTED', 'Consenso iniziale', '2026-02-10'),
('af000000-0000-0000-0000-000000000015', 'GRANTED', 'Consenso iniziale', '2025-11-20'),
('af000000-0000-0000-0000-000000000015', 'REVOKED',  'Revoca volontaria',  '2026-04-15');
