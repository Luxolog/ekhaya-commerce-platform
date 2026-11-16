-- Seller credit notifications: notify at monthly balance thresholds and on successful refunds.
-- This migration is committed to the development branch only; it is not applied to production.

create or replace function public.complete_monthly_search_credit(
  p_user_id uuid,
  p_request_id uuid,
  p_marketplace text
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_event bigint;
  v_plan text;
  v_used integer;
  v_limit integer;
  v_remaining integer;
  v_period date;
  v_threshold_key text;
begin
  update public.search_credit_events
  set status = 'completed', completed_at = now()
  where user_id = p_user_id
    and request_id = p_request_id
    and marketplace = p_marketplace
    and status = 'reserved'
  returning id, period_start into v_event, v_period;

  if v_event is null then
    return false;
  end if;

  select plan_code into v_plan
  from public.profiles
  where id = p_user_id;

  if v_plan = 'free' then
    select searches_used into v_used
    from public.user_free_search_usage
    where user_id = p_user_id;

    v_limit := 5;
    v_remaining := greatest(0, v_limit - coalesce(v_used, 0));

    if v_remaining in (2, 1, 0) then
      v_threshold_key := 'free-search:remaining:' || v_remaining::text;
      insert into public.user_notifications (
        user_id, event_key, notification_type, title, message, action_url, email_status
      )
      values (
        p_user_id,
        v_threshold_key,
        'search_balance',
        case when v_remaining = 0 then 'Your 5 free searches have been used'
             else 'You have ' || v_remaining::text || ' free searches remaining' end,
        case when v_remaining = 0
          then 'You have used all five free Ekhaya Price Checker searches. Choose a subscription plan to continue searching.'
          else 'You have ' || v_remaining::text || ' of your five free searches remaining. Choose a subscription plan when you are ready to continue after your free searches are used.'
        end,
        'https://pricechecker.ekhayatech.co.za/pricing/',
        'pending'
      )
      on conflict (user_id, event_key) do nothing;
    end if;
  else
    -- Monthly balance thresholds are already handled by the
    -- notify_monthly_search_balance trigger on user_monthly_search_usage.
    -- Do not enqueue a second notification here.
    null;
  end if;

  return true;
end;
$function$;

create or replace function public.refund_monthly_search_credit(
  p_user_id uuid,
  p_request_id uuid,
  p_marketplace text
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_event bigint;
  v_period date;
  v_plan text;
  v_used integer;
  v_limit integer;
  v_remaining integer;
begin
  select plan_code into v_plan
  from public.profiles
  where id = p_user_id;

  update public.search_credit_events
  set status = 'refunded'
  where user_id = p_user_id
    and request_id = p_request_id
    and marketplace = p_marketplace
    and status = 'reserved'
  returning id, period_start into v_event, v_period;

  if v_event is null then
    return false;
  end if;

  if v_plan = 'free' then
    update public.user_free_search_usage
    set searches_used = greatest(0, searches_used - 1), updated_at = now()
    where user_id = p_user_id
    returning searches_used into v_used;

    v_limit := 5;
  else
    update public.user_monthly_search_usage
    set searches_used = greatest(0, searches_used - 1), updated_at = now()
    where user_id = p_user_id and period_start = v_period
    returning searches_used into v_used;

    select monthly_search_credits into v_limit
    from public.plan_search_allowances
    where plan_code = v_plan;
  end if;

  v_remaining := greatest(0, coalesce(v_limit, 0) - coalesce(v_used, 0));

  insert into public.user_notifications (
    user_id, event_key, notification_type, title, message, action_url, email_status
  )
  values (
    p_user_id,
    'search-credit:refund:' || v_event::text,
    'search_balance',
    'Your search credit has been refunded',
    'Your ' || initcap(replace(p_marketplace, '_', ' ')) || ' search did not complete successfully. One search credit has been returned. Your available balance is now ' || v_remaining::text || ' searches.',
    'https://pricechecker.ekhayatech.co.za/account/',
    'pending'
  )
  on conflict (user_id, event_key) do nothing;

  return true;
end;
$function$;
