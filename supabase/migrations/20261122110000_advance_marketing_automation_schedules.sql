-- Advance due schedules atomically when a worker creates the corresponding run.
-- Local wall-clock arithmetic preserves the seller's selected timezone across DST changes.
create or replace function public.claim_due_marketing_automations(p_limit integer default 25)
returns setof public.marketing_automation_runs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'p_limit must be between 1 and 100';
  end if;

  return query
  with due as (
    select a.id, a.user_id, a.next_run_at, a.trigger_type, a.recurrence_rule, a.schedule_timezone
    from public.marketing_automations a
    where a.status = 'active' and a.next_run_at <= now()
    order by a.next_run_at
    for update skip locked
    limit p_limit
  ),
  inserted as (
    insert into public.marketing_automation_runs (
      automation_id, user_id, idempotency_key, status, scheduled_for, available_at
    )
    select d.id, d.user_id,
      'marketing-auto:' || d.id::text || ':' || extract(epoch from d.next_run_at)::bigint::text,
      'queued', d.next_run_at, now()
    from due d
    on conflict (idempotency_key) do nothing
    returning *
  ),
  advanced as (
    update public.marketing_automations a
    set
      next_run_at = case
        when d.trigger_type <> 'recurring' then null
        when d.recurrence_rule = 'daily' then
          ((d.next_run_at at time zone d.schedule_timezone) + interval '1 day') at time zone d.schedule_timezone
        when d.recurrence_rule = 'weekly' then
          ((d.next_run_at at time zone d.schedule_timezone) + interval '1 week') at time zone d.schedule_timezone
        when d.recurrence_rule = 'monthly' then
          ((d.next_run_at at time zone d.schedule_timezone) + interval '1 month') at time zone d.schedule_timezone
        else null
      end,
      status = case
        when d.trigger_type <> 'recurring' or d.recurrence_rule not in ('daily','weekly','monthly')
          then 'completed'
        else 'active'
      end
    from due d
    where a.id = d.id and a.user_id = d.user_id
    returning a.id
  )
  select i.* from inserted i;
end;
$$;
revoke all on function public.claim_due_marketing_automations(integer) from public, anon, authenticated;
grant execute on function public.claim_due_marketing_automations(integer) to service_role;

comment on function public.claim_due_marketing_automations(integer) is
  'Service-role-only due scheduler claim. Inserts idempotent runs and advances or completes schedules atomically in the seller timezone.';
