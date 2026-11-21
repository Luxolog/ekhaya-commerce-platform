-- Permit sellers to record their own review/approval state.
-- Approval is an internal workflow state only; it never publishes content externally.
drop policy if exists marketing_campaigns_update_own on public.marketing_campaigns;
create policy marketing_campaigns_update_own
  on public.marketing_campaigns for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and status in ('draft', 'pending_approval', 'approved', 'archived')
    and (status <> 'approved' or approved_at is not null)
  );
