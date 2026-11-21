-- Keep seller-created automations safely dormant until the reviewed worker and scheduler are deployed.
-- Service-role workers bypass RLS; authenticated sellers may pause or cancel, but never activate.
drop policy if exists marketing_automations_update_own on public.marketing_automations;
create policy marketing_automations_update_own
  on public.marketing_automations
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and status in ('paused', 'cancelled')
  );

comment on policy marketing_automations_update_own on public.marketing_automations is
  'Sellers can edit only their own automation rows and keep them paused or cancel them. Activation is reserved for a trusted service-role worker after deployment approval.';
