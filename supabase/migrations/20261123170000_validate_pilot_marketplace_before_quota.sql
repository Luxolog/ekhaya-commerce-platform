-- Keep marketplace eligibility validation ahead of pilot quota checks.
-- Takealot and Makro are supported for pilots; Amazon remains unsupported.
create or replace function public.reserve_seller_pilot_search(
  p_user_id uuid,
  p_marketplace text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_access public.seller_pilot_access%rowtype;
  v_today date := (now() at time zone 'Africa/Johannesburg')::date;
  v_used integer;
  v_total_used integer;
  v_event_id bigint;
begin
  if p_user_id is null or p_request_id is null or p_marketplace is null
     or p_marketplace not in ('takealot','amazon','makro') then
    return jsonb_build_object('allowed',false,'reason','INVALID_REQUEST');
  end if;

  select * into v_access from public.seller_pilot_access
    where user_id=p_user_id and status='active' for update;
  if not found then
    return jsonb_build_object('allowed',false,'reason','PILOT_NOT_ACTIVE');
  end if;
  if now() < v_access.started_at or now() >= v_access.ends_at then
    update public.seller_pilot_access set status='expired'
      where user_id=p_user_id and status='active' and now() >= ends_at;
    return jsonb_build_object('allowed',false,'reason','PILOT_EXPIRED','ends_at',v_access.ends_at);
  end if;

  if p_marketplace = 'amazon' then
    return jsonb_build_object('allowed',false,'reason','PILOT_MARKETPLACE_UNSUPPORTED');
  end if;

  if exists (
    select 1 from public.seller_pilot_search_events
    where user_id=p_user_id and request_id=p_request_id
  ) then
    select searches_used into v_used
      from public.seller_pilot_daily_usage
      where user_id=p_user_id and usage_date=v_today;
    select coalesce(sum(searches_used),0)::integer into v_total_used
      from public.seller_pilot_daily_usage where user_id=p_user_id;
    return jsonb_build_object('allowed',true,'duplicate',true,'used',coalesce(v_used,0),
      'total_used',v_total_used,'limit',v_access.daily_limit,'total_limit',v_access.total_limit);
  end if;

  select coalesce(sum(searches_used),0)::integer into v_total_used
    from public.seller_pilot_daily_usage where user_id=p_user_id;
  if v_total_used >= v_access.total_limit then
    return jsonb_build_object('allowed',false,'reason','PILOT_TOTAL_LIMIT',
      'used',v_total_used,'limit',v_access.total_limit,'ends_at',v_access.ends_at);
  end if;

  insert into public.seller_pilot_search_events(user_id,request_id,marketplace,usage_date)
    values (p_user_id,p_request_id,p_marketplace,v_today)
    on conflict (user_id,request_id) do nothing
    returning id into v_event_id;
  if v_event_id is null then
    return jsonb_build_object('allowed',true,'duplicate',true);
  end if;

  insert into public.seller_pilot_daily_usage(user_id,usage_date,searches_used)
    values (p_user_id,v_today,0) on conflict (user_id,usage_date) do nothing;
  update public.seller_pilot_daily_usage
    set searches_used=searches_used+1,updated_at=now()
    where user_id=p_user_id and usage_date=v_today
      and searches_used < v_access.daily_limit
    returning searches_used into v_used;

  if v_used is null then
    delete from public.seller_pilot_search_events where id=v_event_id;
    select searches_used into v_used from public.seller_pilot_daily_usage
      where user_id=p_user_id and usage_date=v_today;
    return jsonb_build_object('allowed',false,'reason','PILOT_DAILY_LIMIT',
      'used',coalesce(v_used,0),'limit',v_access.daily_limit,'ends_at',v_access.ends_at);
  end if;

  return jsonb_build_object('allowed',true,'duplicate',false,'used',v_used,
    'limit',v_access.daily_limit,'total_used',v_total_used+1,'total_limit',v_access.total_limit,
    'ends_at',v_access.ends_at,'remaining_today',v_access.daily_limit-v_used,
    'remaining_total',v_access.total_limit-v_total_used-1);
end;
$function$;

revoke all on function public.reserve_seller_pilot_search(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_seller_pilot_search(uuid,text,uuid) to service_role;
