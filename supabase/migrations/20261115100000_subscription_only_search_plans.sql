-- Subscription-only Price Checker search billing.
-- Preserve the existing plan prices, subscription rows, and plan codes.
update public.plan_search_allowances set monthly_search_credits=50,updated_at=now() where plan_code='starter';
update public.plan_search_allowances set monthly_search_credits=100,updated_at=now() where plan_code='growth';
update public.plan_search_allowances set monthly_search_credits=250,updated_at=now() where plan_code='pro';
update public.plan_search_allowances set monthly_search_credits=350,updated_at=now() where plan_code='business';

-- The lifetime welcome-search counter is private and is accessed only by service-role RPCs.
create table if not exists public.user_free_search_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  searches_used integer not null default 0 check (searches_used >= 0 and searches_used <= 5),
  updated_at timestamptz not null default now()
);
alter table public.user_free_search_usage enable row level security;
revoke all on public.user_free_search_usage from anon, authenticated;
grant all on public.user_free_search_usage to service_role;

-- Queue balance emails only after a search is confirmed successful.
create or replace function public.reserve_monthly_search_credit(
  p_user_id uuid, p_marketplace text, p_request_id uuid
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_plan text;
  v_status text;
  v_limit integer;
  v_period date;
  v_used integer;
  v_event bigint;
begin
  if p_marketplace not in ('takealot','amazon','makro') then
    return jsonb_build_object('allowed',false,'reason','INVALID_MARKETPLACE');
  end if;

  select plan_code, account_status into v_plan, v_status
  from public.profiles where id=p_user_id;
  if not found or v_status <> 'active' then
    return jsonb_build_object('allowed',false,'reason','ACCOUNT_INACTIVE');
  end if;

  v_period := date_trunc('month', now() at time zone 'UTC')::date;

  if v_plan='free' then
    insert into public.user_free_search_usage(user_id,searches_used)
    values (p_user_id,0) on conflict (user_id) do nothing;

    insert into public.search_credit_events(user_id,period_start,request_id,marketplace)
    values (p_user_id,v_period,p_request_id,p_marketplace)
    on conflict (user_id,request_id,marketplace) do nothing
    returning id into v_event;

    select searches_used into v_used from public.user_free_search_usage
    where user_id=p_user_id for update;

    if v_event is null then
      return jsonb_build_object('allowed',true,'charged',false,'duplicate',true,
        'used',v_used,'limit',5,'remaining',greatest(0,5-v_used),'plan','free');
    end if;

    if v_used >= 5 then
      delete from public.search_credit_events where id=v_event;
      return jsonb_build_object('allowed',false,'reason','FREE_SEARCH_LIMIT',
        'used',v_used,'limit',5,'remaining',0,'plan','free');
    end if;

    update public.user_free_search_usage set searches_used=searches_used+1,updated_at=now()
    where user_id=p_user_id returning searches_used into v_used;

    return jsonb_build_object('allowed',true,'charged',true,'used',v_used,
      'limit',5,'remaining',greatest(0,5-v_used),'plan','free');
  end if;

  select monthly_search_credits into v_limit
  from public.plan_search_allowances where plan_code=v_plan;
  if v_limit is null then
    return jsonb_build_object('allowed',false,'reason','PLAN_QUOTA_NOT_CONFIGURED','plan',v_plan);
  end if;

  insert into public.user_monthly_search_usage(user_id,period_start,searches_used)
  values (p_user_id,v_period,0) on conflict do nothing;

  insert into public.search_credit_events(user_id,period_start,request_id,marketplace)
  values (p_user_id,v_period,p_request_id,p_marketplace)
  on conflict (user_id,request_id,marketplace) do nothing
  returning id into v_event;

  if v_event is null then
    select searches_used into v_used from public.user_monthly_search_usage
    where user_id=p_user_id and period_start=v_period;
    return jsonb_build_object('allowed',true,'charged',false,'duplicate',true,
      'used',v_used,'limit',v_limit,'remaining',greatest(0,v_limit-v_used),'plan',v_plan);
  end if;

  update public.user_monthly_search_usage
  set searches_used=searches_used+1,updated_at=now()
  where user_id=p_user_id and period_start=v_period and searches_used<v_limit
  returning searches_used into v_used;

  if v_used is null then
    delete from public.search_credit_events where id=v_event;
    select searches_used into v_used from public.user_monthly_search_usage
    where user_id=p_user_id and period_start=v_period;
    return jsonb_build_object('allowed',false,'reason','MONTHLY_SEARCH_LIMIT',
      'used',v_used,'limit',v_limit,'remaining',0,'plan',v_plan);
  end if;

  return jsonb_build_object('allowed',true,'charged',true,'used',v_used,
    'limit',v_limit,'remaining',greatest(0,v_limit-v_used),'plan',v_plan);
end;
$$;

create or replace function public.refund_monthly_search_credit(
  p_user_id uuid, p_request_id uuid, p_marketplace text
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_event bigint;
  v_period date;
  v_plan text;
begin
  select plan_code into v_plan from public.profiles where id=p_user_id;

  update public.search_credit_events
  set status='refunded'
  where user_id=p_user_id and request_id=p_request_id and marketplace=p_marketplace
    and status='reserved'
  returning id,period_start into v_event,v_period;

  if v_event is null then return false; end if;

  if v_plan='free' then
    update public.user_free_search_usage
    set searches_used=greatest(0,searches_used-1),updated_at=now()
    where user_id=p_user_id;
  else
    update public.user_monthly_search_usage
    set searches_used=greatest(0,searches_used-1),updated_at=now()
    where user_id=p_user_id and period_start=v_period;
  end if;
  return true;
end;
$$;

create or replace function public.complete_monthly_search_credit(
  p_user_id uuid, p_request_id uuid, p_marketplace text
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_event bigint;
  v_plan text;
  v_used integer;
  v_limit integer;
  v_remaining integer;
begin
  update public.search_credit_events set status='completed',completed_at=now()
  where user_id=p_user_id and request_id=p_request_id and marketplace=p_marketplace
    and status='reserved' returning id into v_event;
  if v_event is null then return false; end if;

  select plan_code into v_plan from public.profiles where id=p_user_id;
  if v_plan='free' then
    select searches_used into v_used from public.user_free_search_usage where user_id=p_user_id;
    v_limit := 5;
    v_remaining := greatest(0,v_limit-coalesce(v_used,0));
    if v_remaining in (2,1,0) then
      insert into public.user_notifications(user_id,event_key,notification_type,title,message,action_url,email_status)
      values (p_user_id,'free-search:remaining:'||v_remaining::text,'search_balance',
        case when v_remaining=0 then 'Your 5 free searches have been used'
             else 'You have '||v_remaining::text||' free searches remaining' end,
        case when v_remaining=0 then 'You have used all five free Ekhaya Price Checker searches. Choose a subscription plan to continue searching.'
             else 'You have '||v_remaining::text||' of your five free searches remaining. Choose a subscription plan when you are ready to continue after your free searches are used.' end,
        'https://pricechecker.ekhayatech.co.za/pricing/','pending')
      on conflict (user_id,event_key) do nothing;
    end if;
  else
    select monthly_search_credits into v_limit from public.plan_search_allowances where plan_code=v_plan;
    select searches_used into v_used from public.user_monthly_search_usage
    where user_id=p_user_id and period_start=(select period_start from public.search_credit_events where id=v_event);
    v_remaining := greatest(0,coalesce(v_limit,0)-coalesce(v_used,0));
    if v_remaining in (5,2,1,0) then
      insert into public.user_notifications(user_id,event_key,notification_type,title,message,action_url,email_status)
      values (p_user_id,'monthly-search:remaining:'||v_remaining::text||':'||
        (select period_start::text from public.search_credit_events where id=v_event),
        'search_balance',
        case when v_remaining=0 then 'Your monthly searches have been used'
             else 'You have '||v_remaining::text||' searches remaining this month' end,
        case when v_remaining=0 then 'You have used all searches included in your plan. Upgrade your plan to continue using Ekhaya Price Checker.'
             else 'You have '||v_remaining::text||' searches remaining in your current billing month.' end,
        'https://pricechecker.ekhayatech.co.za/pricing/','pending')
      on conflict (user_id,event_key) do nothing;
    end if;
  end if;
  return true;
end;
$$;

revoke all on function public.reserve_monthly_search_credit(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.refund_monthly_search_credit(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.complete_monthly_search_credit(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_monthly_search_credit(uuid,text,uuid) to service_role;
grant execute on function public.refund_monthly_search_credit(uuid,uuid,text) to service_role;
grant execute on function public.complete_monthly_search_credit(uuid,uuid,text) to service_role;
