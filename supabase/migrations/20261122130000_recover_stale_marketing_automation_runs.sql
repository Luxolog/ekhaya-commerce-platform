-- Recover automation runs abandoned by a worker crash or interrupted invocation.
-- A 15-minute lease is deliberately longer than the worker's bounded internal action work.
-- The attempt already consumed at claim time; exhausted runs become terminal failures.
create or replace function public.claim_ready_marketing_automation_runs(p_limit integer default 10)
returns setof public.marketing_automation_runs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 25 then
    raise exception 'p_limit must be between 1 and 25';
  end if;

  update public.marketing_automation_runs r
  set status = case
        when r.attempt_count >= a.max_attempts then 'failed'
        else 'queued'
      end,
      available_at = now(),
      completed_at = case
        when r.attempt_count >= a.max_attempts then now()
        else null
      end,
      error_code = 'worker_lease_expired',
      result_summary = case
        when r.attempt_count >= a.max_attempts
          then 'The worker lease expired after the maximum attempts. The run was marked failed.'
        else 'The previous worker lease expired. The run was safely returned to the queue.'
      end
  from public.marketing_automations a
  where r.automation_id = a.id
    and r.user_id = a.user_id
    and r.status = 'running'
    and r.last_attempt_at < now() - interval '15 minutes';

  return query
  with candidates as (
    select r.id
    from public.marketing_automation_runs r
    join public.marketing_automations a
      on a.id = r.automation_id and a.user_id = r.user_id
    where r.status = 'queued'
      and r.available_at <= now()
      and a.status = 'active'
    order by r.available_at, r.created_at
    for update of r skip locked
    limit p_limit
  )
  update public.marketing_automation_runs r
  set status = 'running',
      attempt_count = r.attempt_count + 1,
      started_at = coalesce(r.started_at, now()),
      last_attempt_at = now()
  from candidates c
  where r.id = c.id
  returning r.*;
end;
$$;

revoke all on function public.claim_ready_marketing_automation_runs(integer) from public, anon, authenticated;
grant execute on function public.claim_ready_marketing_automation_runs(integer) to service_role;

comment on function public.claim_ready_marketing_automation_runs(integer) is
  'Service-role-only queue claim. Requeues runs with expired 15-minute worker leases, marks exhausted runs failed, then claims due work with SKIP LOCKED.';
