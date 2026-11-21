-- Automation, analytics and email delivery audit foundations for AI Marketing.
-- Scheduling remains dormant until a reviewed scheduler/worker is configured.

create table if not exists public.marketing_automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null default '',
  trigger_type text not null check (trigger_type in ('scheduled_once','recurring','campaign_reminder','draft_generation')),
  action_type text not null check (action_type in ('create_draft','request_approval','send_reminder')),
  schedule_timezone text not null default 'Africa/Johannesburg',
  next_run_at timestamptz,
  recurrence_rule text,
  conditions jsonb not null default '{}'::jsonb,
  action_config jsonb not null default '{}'::jsonb,
  status text not null default 'paused' check (status in ('active','paused','cancelled','completed')),
  max_attempts integer not null default 3 check (max_attempts between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_automations_id_user_unique unique (id, user_id),
  constraint marketing_automations_conditions_object check (jsonb_typeof(conditions) = 'object'),
  constraint marketing_automations_action_object check (jsonb_typeof(action_config) = 'object'),
  constraint marketing_automations_recurring_rule check (trigger_type <> 'recurring' or nullif(trim(recurrence_rule), '') is not null)
);
create index if not exists marketing_automations_due_idx
  on public.marketing_automations(status, next_run_at) where status = 'active';
create index if not exists marketing_automations_user_updated_idx
  on public.marketing_automations(user_id, updated_at desc);

create table if not exists public.marketing_automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.marketing_automations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null unique,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  scheduled_for timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  result_summary text,
  created_at timestamptz not null default now(),
  constraint marketing_automation_runs_ownership_fk
    foreign key (automation_id, user_id)
    references public.marketing_automations(id, user_id) on delete cascade
);
create index if not exists marketing_automation_runs_user_created_idx
  on public.marketing_automation_runs(user_id, created_at desc);
create index if not exists marketing_automation_runs_automation_created_idx
  on public.marketing_automation_runs(automation_id, created_at desc);

create table if not exists public.marketing_campaign_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  campaign_id uuid references public.marketing_campaigns(id) on delete set null,
  platform text not null default 'other',
  metric_date date not null default current_date,
  impressions bigint check (impressions is null or impressions >= 0),
  reach bigint check (reach is null or reach >= 0),
  clicks bigint check (clicks is null or clicks >= 0),
  conversions bigint check (conversions is null or conversions >= 0),
  sales_zar numeric(14,2) check (sales_zar is null or sales_zar >= 0),
  spend_zar numeric(14,2) check (spend_zar is null or spend_zar >= 0),
  source text not null default 'seller_entered' check (source in ('seller_entered','provider_import')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketing_campaign_performance_user_date_idx
  on public.marketing_campaign_performance(user_id, metric_date desc);
create index if not exists marketing_campaign_performance_campaign_idx
  on public.marketing_campaign_performance(user_id, campaign_id, metric_date desc);

create table if not exists public.marketing_email_delivery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_campaign_id uuid references public.seller_marketing_email_campaigns(id) on delete set null,
  contact_id uuid references public.seller_marketing_contacts(id) on delete set null,
  provider text not null,
  provider_message_id text,
  event_type text not null check (event_type in ('queued','sent','delivered','bounced','complained','failed','suppressed')),
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists marketing_email_delivery_provider_event_unique
  on public.marketing_email_delivery_events(provider, provider_message_id, event_type)
  where provider_message_id is not null;
create index if not exists marketing_email_delivery_user_date_idx
  on public.marketing_email_delivery_events(user_id, occurred_at desc);

alter table public.marketing_automations enable row level security;
alter table public.marketing_automation_runs enable row level security;
alter table public.marketing_campaign_performance enable row level security;
alter table public.marketing_email_delivery_events enable row level security;

drop policy if exists marketing_automations_select_own on public.marketing_automations;
create policy marketing_automations_select_own on public.marketing_automations for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists marketing_automations_insert_own on public.marketing_automations;
create policy marketing_automations_insert_own on public.marketing_automations for insert to authenticated with check (user_id = (select auth.uid()) and status = 'paused');
drop policy if exists marketing_automations_update_own on public.marketing_automations;
create policy marketing_automations_update_own on public.marketing_automations for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists marketing_automations_delete_own on public.marketing_automations;
create policy marketing_automations_delete_own on public.marketing_automations for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists marketing_automation_runs_select_own on public.marketing_automation_runs;
create policy marketing_automation_runs_select_own on public.marketing_automation_runs for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists marketing_campaign_performance_select_own on public.marketing_campaign_performance;
create policy marketing_campaign_performance_select_own on public.marketing_campaign_performance for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists marketing_campaign_performance_insert_own on public.marketing_campaign_performance;
create policy marketing_campaign_performance_insert_own on public.marketing_campaign_performance for insert to authenticated with check (
  user_id = (select auth.uid())
  and (campaign_id is null or exists (
    select 1 from public.marketing_campaigns c where c.id = campaign_id and c.user_id = (select auth.uid())
  ))
);
drop policy if exists marketing_campaign_performance_update_own on public.marketing_campaign_performance;
create policy marketing_campaign_performance_update_own on public.marketing_campaign_performance for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and (campaign_id is null or exists (
    select 1 from public.marketing_campaigns c where c.id = campaign_id and c.user_id = (select auth.uid())
  ))
);
drop policy if exists marketing_campaign_performance_delete_own on public.marketing_campaign_performance;
create policy marketing_campaign_performance_delete_own on public.marketing_campaign_performance for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists marketing_email_delivery_events_select_own on public.marketing_email_delivery_events;
create policy marketing_email_delivery_events_select_own on public.marketing_email_delivery_events for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.marketing_automations to authenticated;
grant select on public.marketing_automation_runs to authenticated;
grant select, insert, update, delete on public.marketing_campaign_performance to authenticated;
grant select on public.marketing_email_delivery_events to authenticated;
grant all on public.marketing_automations, public.marketing_automation_runs, public.marketing_campaign_performance, public.marketing_email_delivery_events to service_role;

create or replace function public.set_marketing_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists marketing_automations_updated_at on public.marketing_automations;
create trigger marketing_automations_updated_at before update on public.marketing_automations for each row execute function public.set_marketing_updated_at();
drop trigger if exists marketing_campaign_performance_updated_at on public.marketing_campaign_performance;
create trigger marketing_campaign_performance_updated_at before update on public.marketing_campaign_performance for each row execute function public.set_marketing_updated_at();

-- Worker-only claim primitive. It creates idempotent run records; no worker is deployed by this migration.
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
    select a.id, a.user_id, a.next_run_at
    from public.marketing_automations a
    where a.status = 'active' and a.next_run_at <= now()
    order by a.next_run_at
    for update skip locked
    limit p_limit
  ), inserted as (
    insert into public.marketing_automation_runs (
      automation_id, user_id, idempotency_key, status, scheduled_for
    )
    select d.id, d.user_id,
      'marketing-auto:' || d.id::text || ':' || extract(epoch from d.next_run_at)::bigint::text,
      'queued', d.next_run_at
    from due d
    on conflict (idempotency_key) do nothing
    returning *
  )
  select * from inserted;
end;
$$;
revoke all on function public.claim_due_marketing_automations(integer) from public, anon, authenticated;
grant execute on function public.claim_due_marketing_automations(integer) to service_role;

comment on table public.marketing_campaign_performance is
  'Seller-entered or provider-imported performance metrics. Null values mean unavailable; no synthetic metrics are generated.';
comment on table public.marketing_automations is
  'Seller automation rules. New rules default to paused; execution requires a separately configured worker.';
