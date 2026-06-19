-- WARD Module 1 — RLS. Service role bypassa SEMPRE (worker/server).
-- Owner-scoped: l'utente legge solo le righe dei propri avatar.
-- Interne/transitorie (scan_candidates, audit_log): RLS ON senza policy = lock totale
-- agli authenticated/anon (solo service role), stato sano voluto.
-- Idempotente (drop policy if exists prima di ogni create).

alter table monitoring_consents enable row level security;
drop policy if exists "owner reads own monitoring_consents" on monitoring_consents;
create policy "owner reads own monitoring_consents" on monitoring_consents
  for select using (avatar_id in (select id from avatars where owner_id = auth.uid()));

alter table scan_jobs enable row level security;
drop policy if exists "owner reads own scan_jobs" on scan_jobs;
create policy "owner reads own scan_jobs" on scan_jobs
  for select using (avatar_id in (select id from avatars where owner_id = auth.uid()));

alter table scan_matches enable row level security;
drop policy if exists "owner reads own scan_matches" on scan_matches;
create policy "owner reads own scan_matches" on scan_matches
  for select using (avatar_id in (select id from avatars where owner_id = auth.uid()));

alter table allowlist enable row level security;
drop policy if exists "owner reads own allowlist" on allowlist;
create policy "owner reads own allowlist" on allowlist
  for select using (avatar_id in (select id from avatars where owner_id = auth.uid()));

-- Evidence e Nemesis: owner via il match collegato.
alter table evidence_records enable row level security;
drop policy if exists "owner reads own evidence" on evidence_records;
create policy "owner reads own evidence" on evidence_records
  for select using (scan_match_id in (
    select m.id from scan_matches m
    join avatars a on a.id = m.avatar_id
    where a.owner_id = auth.uid()));

alter table nemesis_actions enable row level security;
drop policy if exists "owner reads own nemesis_actions" on nemesis_actions;
create policy "owner reads own nemesis_actions" on nemesis_actions
  for select using (scan_match_id in (
    select m.id from scan_matches m
    join avatars a on a.id = m.avatar_id
    where a.owner_id = auth.uid()));

-- Interne: RLS ON, nessuna policy (deny by default; solo service role).
alter table scan_candidates enable row level security;
alter table audit_log enable row level security;
