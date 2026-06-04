-- Seed dei 6 avatar demo
-- I token_hash sono pre-calcolati con SHA256(id|consent_start|JSON(approved_categories))
-- usando gli UUID fissi qui sotto.

insert into avatars (id, handle, alias, portrait_url, tier, gender, age_range, ethnicity, hair_color, body_type, approved_categories, excluded_categories, consent_start, consent_end, revoked_at, token_hash, usage_count, royalty_accrued_cents, is_demo) values

-- 1. Mario R. — SOUL — Attivo
('a1000000-0000-0000-0000-000000000001',
 'mario-r', 'Mario R.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=mario-r&backgroundColor=6B21E8',
 'SOUL', 'uomo', '30-40', 'italiano', 'castani', 'atletico',
 ARRAY['Food','Fashion','Travel'],
 ARRAY['Politics','Alcohol'],
 '2026-01-10', null, null,
 encode(sha256(('a1000000-0000-0000-0000-000000000001' || '|' || '2026-01-10' || '|' || '["Food","Fashion","Travel"]')::bytea), 'hex'),
 142, 1880, true),

-- 2. Giulia V. — HUMAN — Attivo
('a2000000-0000-0000-0000-000000000002',
 'giulia-v', 'Giulia V.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=giulia-v&backgroundColor=B8005C',
 'HUMAN', 'donna', '25-35', 'italiana', 'biondi', 'slim',
 ARRAY['Beauty','Fashion','Lifestyle','Business'],
 ARRAY['Healthcare'],
 '2026-02-01', null, null,
 encode(sha256(('a2000000-0000-0000-0000-000000000002' || '|' || '2026-02-01' || '|' || '["Beauty","Fashion","Lifestyle","Business"]')::bytea), 'hex'),
 308, 5120, true),

-- 3. Kenji T. — SHAPE — Attivo
('a3000000-0000-0000-0000-000000000003',
 'kenji-t', 'Kenji T.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=kenji-t&backgroundColor=00A896',
 'SHAPE', 'uomo', '20-30', 'giapponese', 'neri', 'slim',
 ARRAY['Sport','Travel','Entertainment'],
 ARRAY['Politics'],
 '2026-03-05', null, null,
 encode(sha256(('a3000000-0000-0000-0000-000000000003' || '|' || '2026-03-05' || '|' || '["Sport","Travel","Entertainment"]')::bytea), 'hex'),
 67, 540, true),

-- 4. Amara N. — SOUL — Attivo
('a4000000-0000-0000-0000-000000000004',
 'amara-n', 'Amara N.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=amara-n&backgroundColor=6B21E8',
 'SOUL', 'donna', '30-40', 'nigeriana', 'neri', 'curvy',
 ARRAY['Fashion','Beauty','Business','Luxury'],
 ARRAY['Alcohol'],
 '2026-01-20', null, null,
 encode(sha256(('a4000000-0000-0000-0000-000000000004' || '|' || '2026-01-20' || '|' || '["Fashion","Beauty","Business","Luxury"]')::bytea), 'hex'),
 195, 2730, true),

-- 5. Luca B. — SPARK — Attivo
('a5000000-0000-0000-0000-000000000005',
 'luca-b', 'Luca B.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=luca-b&backgroundColor=374151',
 'SPARK', 'uomo', '40-50', 'italiano', 'brizzolato', 'robusto',
 ARRAY['Food','Business'],
 ARRAY['Sport','Entertainment'],
 '2025-12-15', null, null,
 encode(sha256(('a5000000-0000-0000-0000-000000000005' || '|' || '2025-12-15' || '|' || '["Food","Business"]')::bytea), 'hex'),
 23, 90, true),

-- 6. Sofia M. — HUMAN — REVOCATO dal 2026-05-01
('a6000000-0000-0000-0000-000000000006',
 'sofia-m', 'Sofia M.',
 'https://api.dicebear.com/7.x/shapes/svg?seed=sofia-m&backgroundColor=374151',
 'HUMAN', 'donna', '50-60', 'spagnola', 'grigi', 'normale',
 ARRAY['Healthcare','Business','Lifestyle'],
 ARRAY['Fashion','Beauty'],
 '2025-11-01', null, '2026-05-01',
 encode(sha256(('a6000000-0000-0000-0000-000000000006' || '|' || '2025-11-01' || '|' || '["Healthcare","Business","Lifestyle"]')::bytea), 'hex'),
 88, 1240, true);

-- Eventi di consenso per la timeline
insert into consent_events (avatar_id, event_type, detail, occurred_at) values
('a1000000-0000-0000-0000-000000000001', 'GRANTED', 'Consenso iniziale', '2026-01-10'),
('a2000000-0000-0000-0000-000000000002', 'GRANTED', 'Consenso iniziale', '2026-02-01'),
('a3000000-0000-0000-0000-000000000003', 'GRANTED', 'Consenso iniziale', '2026-03-05'),
('a4000000-0000-0000-0000-000000000004', 'GRANTED', 'Consenso iniziale', '2026-01-20'),
('a5000000-0000-0000-0000-000000000005', 'GRANTED', 'Consenso iniziale', '2025-12-15'),
('a6000000-0000-0000-0000-000000000006', 'GRANTED', 'Consenso iniziale', '2025-11-01'),
('a6000000-0000-0000-0000-000000000006', 'REVOKED',  'Revoca volontaria',  '2026-05-01');
