-- Monthly seller search credits: one credit per live marketplace lookup; cache hits are free.
alter table public.marketplace_connections drop constraint if exists marketplace_connections_marketplace_check;
alter table public.marketplace_connections add constraint marketplace_connections_marketplace_check
  check (marketplace in ('takealot','amazon','makro'));

alter table public.marketplace_price_cache drop constraint if exists marketplace_price_cache_marketplace_check;
alter table public.marketplace_price_cache add constraint marketplace_price_cache_marketplace_check
  check (marketplace in ('takealot','amazon','makro'));

create table if not exists public.plan_search_allowances (
  plan_code text primary key check (plan_code in ('free','starter','pro','business')),
  monthly_search_credits integer not null check (monthly_search_credits >= 0),
  updated_at timestamptz not null default now()
);
insert into public.plan_search_allowances(plan_code, monthly_search_credits)
values ('starter', 100)
on conflict (plan_code) do update set monthly_search_credits = excluded.monthly_search_credits, updated_at = now();

create table if not exists public.user_monthly_search_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  searches_used integer not null default 0 check (searches_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

create table if not exists public.search_credit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  request_id uuid not null,
  marketplace text not null check (marketplace in ('takealot','amazon','makro')),
  status text not null default 'reserved' check (status in ('reserved','completed','refunded')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id, request_id, marketplace)
);

alter table public.user_monthly_search_usage enable row level security;
alter table public.search_credit_events enable row level security;
alter table public.plan_search_allowances enable row level security;
revoke all on public.user_monthly_search_usage, public.search_credit_events, public.plan_search_allowances from anon, authenticated;
grant all on public.user_monthly_search_usage, public.search_credit_events, public.plan_search_allowances to service_role;

create or replace function public.reserve_monthly_search_credit(
  p_user_id uuid, p_marketplace text, p_request_id uuid
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_plan text; v_status text; v_limit integer; v_period date; v_used integer; v_event bigint;
begin
  if p_marketplace not in ('takealot','amazon','makro') then
    return jsonb_build_object('allowed',false,'reason','INVALID_MARKETPLACE');
  end if;
  select plan_code, account_status into v_plan, v_status
  from public.profiles where id = p_user_id;
  if not found or v_status <> 'active' then
    return jsonb_build_object('allowed',false,'reason','ACCOUNT_INACTIVE');
  end if;
  select monthly_search_credits into v_limit
  from public.plan_search_allowances where plan_code = v_plan;
  if v_limit is null then
    return jsonb_build_object('allowed',false,'reason','PLAN_QUOTA_NOT_CONFIGURED','plan',v_plan);
  end if;
  v_period := date_trunc('month', now() at time zone 'UTC')::date;

  insert into public.user_monthly_search_usage(user_id, period_start, searches_used)
  values (p_user_id, v_period, 0) on conflict do nothing;

  insert into public.search_credit_events(user_id, period_start, request_id, marketplace)
  values (p_user_id, v_period, p_request_id, p_marketplace)
  on conflict (user_id, request_id, marketplace) do nothing
  returning id into v_event;

  if v_event is null then
    select searches_used into v_used from public.user_monthly_search_usage
    where user_id=p_user_id and period_start=v_period;
    return jsonb_build_object('allowed',true,'charged',false,'duplicate',true,'used',v_used,'limit',v_limit);
  end if;

  update public.user_monthly_search_usage
  set searches_used = searches_used + 1, updated_at = now()
  where user_id=p_user_id and period_start=v_period and searches_used < v_limit
  returning searches_used into v_used;

  if v_used is null then
    delete from public.search_credit_events where id=v_event;
    select searches_used into v_used from public.user_monthly_search_usage
    where user_id=p_user_id and period_start=v_period;
    return jsonb_build_object('allowed',false,'reason','MONTHLY_SEARCH_LIMIT','used',v_used,'limit',v_limit,'plan',v_plan);
  end if;
  return jsonb_build_object('allowed',true,'charged',true,'used',v_used,'limit',v_limit,'plan',v_plan);
end;
$$;

create or replace function public.refund_monthly_search_credit(
  p_user_id uuid, p_request_id uuid, p_marketplace text
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_period date; v_event bigint;
begin
  v_period := date_trunc('month', now() at time zone 'UTC')::date;
  update public.search_credit_events set status='refunded'
  where user_id=p_user_id and request_id=p_request_id and marketplace=p_marketplace
    and status='reserved' returning id into v_event;
  if v_event is null then return false; end if;
  update public.user_monthly_search_usage
  set searches_used = greatest(0, searches_used - 1), updated_at=now()
  where user_id=p_user_id and period_start=v_period;
  return true;
end;
$$;

create or replace function public.complete_monthly_search_credit(
  p_user_id uuid, p_request_id uuid, p_marketplace text
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_event bigint;
begin
  update public.search_credit_events set status='completed', completed_at=now()
  where user_id=p_user_id and request_id=p_request_id and marketplace=p_marketplace
    and status='reserved' returning id into v_event;
  return v_event is not null;
end;
$$;

revoke all on function public.reserve_monthly_search_credit(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.refund_monthly_search_credit(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.complete_monthly_search_credit(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_monthly_search_credit(uuid,text,uuid) to service_role;
grant execute on function public.refund_monthly_search_credit(uuid,uuid,text) to service_role;
grant execute on function public.complete_monthly_search_credit(uuid,uuid,text) to service_role;
