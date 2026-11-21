-- Durable internal action inbox and retry metadata for the AI Marketing automation worker.
-- This does not send email, publish content, or call external providers.
alter table public.marketing_automation_runs
  add column if not exists available_at timestamptz not null default now(),
  add column if not exists last_attempt_at timestamptz;

create index if not exists marketing_automation_runs_ready_idx
  on public.marketing_automation_runs(status, available_at, created_at)
  where status in ('queued','failed');

create table if not exists public.marketing_automation_action_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.marketing_automation_runs(id) on delete cascade,
  automation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null check (action_type in ('create_draft','request_approval','send_reminder')),
  title text not null,
  body text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint marketing_automation_action_events_ownership_fk
    foreign key (automation_id, user_id)
    references public.marketing_automations(id, user_id) on delete cascade,
  constraint marketing_automation_action_events_payload_object check (jsonb_typeof(payload) = 'object')
);
create index if not exists marketing_automation_action_events_user_created_idx
  on public.marketing_automation_action_events(user_id, created_at desc);
alter table public.marketing_automation_action_events enable row level security;
drop policy if exists marketing_automation_action_events_select_own on public.marketing_automation_action_events;
create policy marketing_automation_action_events_select_own
  on public.marketing_automation_action_events for select to authenticated
  using (user_id = (select auth.uid()));
grant select on public.marketing_automation_action_events to authenticated;
grant all on public.marketing_automation_action_events to service_role;

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

comment on table public.marketing_automation_action_events is
  'Internal seller-visible automation action inbox. Events are idempotent by run_id; no external messages or publishing are performed.';
