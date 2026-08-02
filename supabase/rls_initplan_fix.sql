-- Advisor Supabase "auth_rls_initplan" (2026-08-01): nelle policy RLS,
-- auth.uid() nudo viene rivalutato RIGA PER RIGA; avvolto in (select ...)
-- Postgres lo calcola una volta sola per query (InitPlan). Stessa semantica,
-- solo piu' veloce a scala. Riscrive le 23 policy segnalate.

-- profiles
alter policy profiles_select_own on public.profiles
  using ((select auth.uid()) = id);
alter policy profiles_update_own on public.profiles
  using ((select auth.uid()) = id);

-- avatars
alter policy avatars_select_own on public.avatars
  using ((select auth.uid()) = owner_id);
alter policy avatars_update_own on public.avatars
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- generations / generation_jobs
alter policy generations_select_own on public.generations
  using ((select auth.uid()) = buyer_id);
alter policy generation_jobs_select_own on public.generation_jobs
  using ((select auth.uid()) = buyer_id);

-- volt / match alerts
alter policy volt_tx_select_own on public.volt_transactions
  using ((select auth.uid()) = user_id);
alter policy match_alerts_select_own on public.match_alerts
  using ((select auth.uid()) = buyer_id);

-- organizations
alter policy organizations_select_own on public.organizations
  using ((select auth.uid()) = owner_id);
alter policy organizations_update_own on public.organizations
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- academy
alter policy progressi_select_own on public.progressi
  using ((select auth.uid()) = utente);
alter policy certificazioni_select_own on public.certificazioni
  using ((select auth.uid()) = utente);

-- consent / payouts (via avatar)
alter policy consent_events_select_via_avatar on public.consent_events
  using (exists (select 1 from avatars a
                 where a.id = consent_events.avatar_id
                   and a.owner_id = (select auth.uid())));
alter policy payouts_select_via_avatar on public.payouts
  using (exists (select 1 from avatars a
                 where a.id = payouts.avatar_id
                   and a.owner_id = (select auth.uid())));

-- ward (owner via avatar)
alter policy "owner reads own monitoring_consents" on public.monitoring_consents
  using (avatar_id in (select id from avatars where owner_id = (select auth.uid())));
alter policy "owner reads own scan_jobs" on public.scan_jobs
  using (avatar_id in (select id from avatars where owner_id = (select auth.uid())));
alter policy "owner reads own scan_matches" on public.scan_matches
  using (avatar_id in (select id from avatars where owner_id = (select auth.uid())));
alter policy "owner reads own allowlist" on public.allowlist
  using (avatar_id in (select id from avatars where owner_id = (select auth.uid())));
alter policy "owner reads own evidence" on public.evidence_records
  using (scan_match_id in (select m.id from scan_matches m
                           join avatars a on a.id = m.avatar_id
                           where a.owner_id = (select auth.uid())));
alter policy "owner reads own nemesis_actions" on public.nemesis_actions
  using (scan_match_id in (select m.id from scan_matches m
                           join avatars a on a.id = m.avatar_id
                           where a.owner_id = (select auth.uid())));

-- takedown_profile (nemesis)
alter policy "tp owner select" on public.takedown_profile
  using (user_id = (select auth.uid()));
alter policy "tp owner update" on public.takedown_profile
  using (user_id = (select auth.uid()));
alter policy "tp owner insert" on public.takedown_profile
  with check (user_id = (select auth.uid()));
